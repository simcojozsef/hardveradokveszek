<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Stripe\StripeClient;

/*
 * Thin wrapper around the Stripe SDK.
 *
 * Deliberately not Cashier: the entitlement rules here (paid period, bumps per
 * period, downgrade archiving) are custom, and a second subscription state
 * machine would fight this one.
 */
class StripeService
{
    private ?StripeClient $client = null;

    public function client(): StripeClient
    {
        return $this->client ??= new StripeClient([
            'api_key' => config('services.stripe.secret'),
            'stripe_version' => config('services.stripe.api_version'),
        ]);
    }

    /** The configured PRO price, or null when checkout is not set up yet. */
    public function proPriceId(): ?string
    {
        $id = config('services.stripe.pro_price_id');

        return is_string($id) && $id !== '' ? $id : null;
    }

    public function isConfigured(): bool
    {
        return (bool) config('services.stripe.secret') && $this->proPriceId() !== null;
    }

    /**
     * Resolve (and cache) the seller's Stripe customer.
     *
     * The customer id is stored on the user row, so a second request reuses
     * the same customer instead of creating a duplicate.
     */
    public function ensureCustomer(User $user): string
    {
        if ($user->stripe_customer_id) {
            return $user->stripe_customer_id;
        }

        $customer = $this->client()->customers->create([
            'email' => $user->email,
            'name' => $user->name,
            'metadata' => [
                // Server-recorded identity; the client can never set this.
                'gigapiac_user_id' => (string) $user->id,
            ],
        ]);

        $user->forceFill(['stripe_customer_id' => $customer->id])->save();

        return $customer->id;
    }

    /**
     * A subscription that is still live or in flight for this seller.
     *
     * Used to refuse a second parallel checkout: one seller, one open
     * subscription at a time.
     */
    public function liveSubscription(User $user): ?Subscription
    {
        return Subscription::query()
            ->where('user_id', $user->id)
            ->whereIn('status', Subscription::OPEN_STATUSES)
            ->latest('id')
            ->first();
    }

    /**
     * Create a Checkout session in subscription mode.
     *
     * The amount and price come from configuration only: the request may not
     * send a price, an amount or a tax rate.
     *
     * @return array{url: string, session_id: string}
     *
     * @throws ValidationException
     */
    public function createProCheckoutSession(
        User $user,
        string $successUrl,
        string $cancelUrl,
    ): array {
        $priceId = $this->proPriceId();

        if (!$priceId) {
            throw ValidationException::withMessages([
                'plan' => 'A PRO előfizetés még nincs bekonfigurálva.',
            ]);
        }

        /*
         * The lock covers the whole check-then-create sequence, so a double
         * click or two parallel tabs cannot both open a session.
         */
        return DB::transaction(function () use ($user, $priceId, $successUrl, $cancelUrl) {
            $locked = User::query()
                ->whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($this->liveSubscription($locked)) {
                throw ValidationException::withMessages([
                    'plan' => 'Már van folyamatban lévő vagy élő előfizetésed.',
                ]);
            }

            /*
             * An invoice must be issuable for every payment, so complete
             * billing data is a hard precondition — not something collected
             * afterwards.
             */
            $this->assertBillingComplete($locked);

            $customerId = $this->ensureCustomer($locked);

            /*
             * Deterministic idempotency key per seller: a retried request
             * within the same minute returns the same session instead of
             * creating a second one.
             */
            $idempotencyKey = sprintf(
                'pro-checkout-%d-%s',
                $locked->id,
                now()->format('YmdHi')
            );

            $session = $this->client()->checkout->sessions->create([
                'mode' => 'subscription',
                'customer' => $customerId,
                'line_items' => [[
                    'price' => $priceId,
                    'quantity' => 1,
                ]],
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                // Server-recorded seller identity, never client supplied.
                'metadata' => [
                    'gigapiac_user_id' => (string) $locked->id,
                    'gigapiac_plan' => PlanService::PRO,
                ],
                'subscription_data' => [
                    'metadata' => [
                        'gigapiac_user_id' => (string) $locked->id,
                        'gigapiac_plan' => PlanService::PRO,
                    ],
                ],
                /*
                 * No payment_method_types: the pinned API version manages
                 * payment methods from the Dashboard, and sending the old
                 * parameter is now rejected outright.
                 */
            ], [
                'idempotency_key' => $idempotencyKey,
            ]);

            /*
             * Record the pending subscription locally right away so the next
             * request already sees an open attempt. PRO is still NOT granted:
             * that only happens on a verified payment event.
             */
            Subscription::create([
                'user_id' => $locked->id,
                'stripe_subscription_id' => $session->subscription,
                'stripe_customer_id' => $customerId,
                'stripe_price_id' => $priceId,
                'status' => 'incomplete',
            ]);

            return [
                'url' => $session->url,
                'session_id' => $session->id,
            ];
        });
    }

    /**
     * Billing data is required before a payment may start.
     *
     * Checked on the server too, so a direct API call cannot skip the form
     * the UI insists on.
     *
     * @throws ValidationException
     */
    public function isBillingComplete(User $user): bool
    {
        try {
            $this->assertBillingComplete($user);

            return true;
        } catch (ValidationException) {
            return false;
        }
    }

    public function assertBillingComplete(User $user): void
    {
        $profile = \App\Models\BillingProfile::where('user_id', $user->id)->first();

        if (!$profile) {
            throw ValidationException::withMessages([
                'billing' => 'A fizetés előtt add meg a számlázási adatokat.',
            ]);
        }

        $required = [
            'name' => 'Név',
            'email' => 'Számlázási e-mail',
            'country' => 'Ország',
            'postal_code' => 'Irányítószám',
            'city' => 'Település',
            'address' => 'Cím',
        ];

        // A company invoice is only valid with a tax number.
        if ($profile->isCompany()) {
            $required['tax_number'] = 'Adószám';
        }

        $missing = [];

        foreach ($required as $field => $label) {
            if (trim((string) $profile->{$field}) === '') {
                $missing[] = $label;
            }
        }

        if ($missing !== []) {
            throw ValidationException::withMessages([
                'billing' => 'Hiányzó számlázási adatok: ' . implode(', ', $missing) . '.',
            ]);
        }
    }

    /**
     * Billing portal for the seller's own customer only.
     *
     * The customer id comes from the stored user record, so a seller can never
     * open someone else's portal.
     */
    public function createBillingPortalSession(User $user, string $returnUrl): string
    {
        if (!$user->stripe_customer_id) {
            throw ValidationException::withMessages([
                'plan' => 'Ehhez a fiókhoz még nincs Stripe vevő.',
            ]);
        }

        $session = $this->client()->billingPortal->sessions->create([
            'customer' => $user->stripe_customer_id,
            'return_url' => $returnUrl,
        ]);

        return $session->url;
    }
}

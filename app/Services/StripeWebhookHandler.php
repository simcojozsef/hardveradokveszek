<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/*
 * Business logic for each Stripe event type.
 *
 * Reads the raw webhook payload shape (the account's pinned API version),
 * not SDK objects, so a version skew between the webhook and the SDK cannot
 * change field names underneath us.
 *
 * The rule that governs everything here: an entitlement only ever comes from
 * a verified paid period, never from a status flag, a success URL or a
 * frontend state.
 */
class StripeWebhookHandler
{
    public function __construct(
        private readonly SubscriptionPaymentService $payments,
    ) {
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return string  'handled' | 'ignored'
     */
    public function handle(string $type, array $payload): string
    {
        return match ($type) {
            'checkout.session.completed' => $this->onCheckoutCompleted($payload),
            'customer.subscription.created',
            'customer.subscription.updated' => $this->onSubscriptionUpserted($payload),
            'customer.subscription.deleted' => $this->onSubscriptionDeleted($payload),
            'invoice.paid' => $this->onInvoicePaid($payload),
            'invoice.payment_failed' => $this->onPaymentFailed($payload),
            'invoice.payment_action_required' => $this->onPaymentActionRequired($payload),
            'invoice.finalization_failed' => $this->onFinalizationFailed($payload),
            default => 'ignored',
        };
    }

    /**
     * Checkout completion links the seller to the subscription.
     *
     * Does NOT grant PRO: payment confirmation arrives with invoice.paid.
     *
     * @param  array<string, mixed>  $payload
     */
    private function onCheckoutCompleted(array $payload): string
    {
        $session = $payload['data']['object'] ?? [];
        $userId = $this->metaUserId($session);

        if (!$userId) {
            Log::warning('checkout.session.completed without a seller id.');

            return 'ignored';
        }

        $subscriptionId = $session['subscription'] ?? null;

        if (!$subscriptionId) {
            return 'ignored';
        }

        // Link only; entitlement is untouched here.
        Subscription::query()
            ->where('stripe_subscription_id', $subscriptionId)
            ->where('user_id', $userId)
            ->update(['stripe_customer_id' => $session['customer'] ?? null]);

        return 'handled';
    }

    /**
     * Mirror the Stripe subscription state locally.
     *
     * The local paid-through date is only extended by a paid invoice, so a
     * status change alone never grants or extends PRO.
     *
     * @param  array<string, mixed>  $payload
     */
    private function onSubscriptionUpserted(array $payload): string
    {
        $subscriptionData = $payload['data']['object'] ?? [];
        $subscription = $this->findSubscription($subscriptionData);

        if (!$subscription) {
            return 'ignored';
        }

        $subscription->forceFill([
            'status' => $subscriptionData['status'] ?? $subscription->status,
            'cancel_at_period_end' => (bool) ($subscriptionData['cancel_at_period_end'] ?? false),
            'stripe_customer_id' => $subscriptionData['customer'] ?? $subscription->stripe_customer_id,
            'current_period_start' => $this->timestamp($subscriptionData['current_period_start'] ?? null),
            'current_period_end' => $this->timestamp($subscriptionData['current_period_end'] ?? null),
            'canceled_at' => $this->timestamp($subscriptionData['canceled_at'] ?? null),
        ])->save();

        return 'handled';
    }

    /**
     * A deleted subscription stops auto-renewal.
     *
     * PRO is deliberately NOT revoked here: the seller keeps what they already
     * paid for until the stored paid-through date passes.
     *
     * @param  array<string, mixed>  $payload
     */
    private function onSubscriptionDeleted(array $payload): string
    {
        $subscriptionData = $payload['data']['object'] ?? [];
        $subscription = $this->findSubscription($subscriptionData);

        if (!$subscription) {
            return 'ignored';
        }

        $subscription->forceFill([
            'status' => 'canceled',
            'cancel_at_period_end' => false,
            'ended_at' => now(),
        ])->save();

        // Entitlement is left alone; the paid period still runs.
        return 'handled';
    }

    /**
     * The one event that extends entitlement.
     *
     * Grants exactly one period, one set of bumps and one invoice task for the
     * paid period. The period identity makes a replay a no-op.
     *
     * @param  array<string, mixed>  $payload
     */
    private function onInvoicePaid(array $payload): string
    {
        $invoice = $payload['data']['object'] ?? [];

        /*
         * Only a fully settled invoice for the right product counts. A zero
         * amount, a manually marked-paid invoice or a different line item is
         * not a 4 990 Ft payment.
         */
        if (!$this->isGenuineProPayment($invoice)) {
            Log::warning('invoice.paid ignored: does not look like a PRO payment.', [
                'invoice_id' => $invoice['id'] ?? null,
                'amount_paid' => $invoice['amount_paid'] ?? null,
                'status' => $invoice['status'] ?? null,
            ]);

            return 'ignored';
        }

        $subscriptionId = $this->subscriptionIdFromInvoice($invoice);
        $subscription = $subscriptionId
            ? Subscription::where('stripe_subscription_id', $subscriptionId)->first()
            : null;

        if (!$subscription) {
            Log::warning('invoice.paid ignored: no local subscription.', [
                'invoice_id' => $invoice['id'] ?? null,
            ]);

            return 'ignored';
        }

        $user = User::find($subscription->user_id);

        if (!$user) {
            return 'ignored';
        }

        $periodStart = $this->timestamp($invoice['lines']['data'][0]['period']['start'] ?? null)
            ?? now();
        $periodEnd = $this->timestamp($invoice['lines']['data'][0]['period']['end'] ?? null)
            ?? now()->addMonth();

        $result = $this->payments->recordPaidPeriod(
            $user,
            $subscription,
            (string) $invoice['id'],
            $periodStart,
            $periodEnd,
            (int) ($invoice['amount_paid'] ?? 0),
            strtoupper((string) ($invoice['currency'] ?? 'huf')),
        );

        /*
         * Notify after the transaction has committed, and only for a genuinely
         * new period: the type is null on a replay, so a repeated webhook
         * cannot mail the seller twice.
         */
        if ($result['notification_type']) {
            $notifier = app(\App\Services\SubscriptionNotifier::class);
            $user->refresh();

            $notifier->notify($user, $result['notification_type'], array_merge(
                $notifier->planContext($user),
                ['entitled_until' => $user->pro_entitled_until?->toIso8601String()],
            ));
        }

        /*
         * Issue the invoice for this period. The task was created (or already
         * existed) inside recordPaidPeriod, so a replay finds it and the
         * Számlázz.hu order number prevents a duplicate document.
         */
        if ($result['invoice_task_id']) {
            $task = \App\Models\InvoiceTask::find($result['invoice_task_id']);

            if ($task && $task->status !== \App\Models\InvoiceTask::ISSUED) {
                app(\App\Services\SubscriptionPaymentService::class)
                    ->processInvoiceTask($task);
            }
        }

        return 'handled';
    }

    /**
     * A failed renewal must not extend the paid period nor add bumps.
     *
     * @param  array<string, mixed>  $payload
     */
    private function onPaymentFailed(array $payload): string
    {
        $invoice = $payload['data']['object'] ?? [];
        $subscription = $this->subFromInvoice($invoice);

        if (!$subscription) {
            return 'ignored';
        }

        // Reflect the decline; entitlement and bumps stay untouched.
        $subscription->forceFill(['status' => 'past_due'])->save();

        Log::info('PRO payment failed.', [
            'invoice_id' => $invoice['id'] ?? null,
            'user_id' => $subscription->user_id,
        ]);

        /*
         * One notice per failed invoice: the notification is keyed on the
         * Stripe invoice id, so Stripe's repeated retries of the same failure
         * do not mail the seller on every attempt.
         */
        $this->notifyOnce(
            $subscription->user,
            'payment_failed:' . ($invoice['id'] ?? 'unknown'),
            \App\Notifications\SubscriptionNotification::PAYMENT_FAILED,
        );

        return 'handled';
    }

    /**
     * The bank asked for extra authentication (e.g. 3DS).
     *
     * @param  array<string, mixed>  $payload
     */
    private function onPaymentActionRequired(array $payload): string
    {
        $invoice = $payload['data']['object'] ?? [];
        $subscription = $this->subFromInvoice($invoice);

        if ($subscription) {
            $subscription->forceFill(['status' => 'past_due'])->save();

            $this->notifyOnce(
                $subscription->user,
                'action_required:' . ($invoice['id'] ?? 'unknown'),
                \App\Notifications\SubscriptionNotification::ACTION_REQUIRED,
            );
        }

        Log::info('PRO payment action required.', [
            'invoice_id' => $invoice['id'] ?? null,
            'hosted_url' => $invoice['hosted_invoice_url'] ?? null,
        ]);

        return 'handled';
    }

    /**
     * A draft invoice could not be finalised — flag it for admin review.
     *
     * @param  array<string, mixed>  $payload
     */
    private function onFinalizationFailed(array $payload): string
    {
        $invoice = $payload['data']['object'] ?? [];

        Log::error('Stripe invoice finalization failed.', [
            'invoice_id' => $invoice['id'] ?? null,
            'customer' => $invoice['customer'] ?? null,
            'last_error' => $invoice['last_finalization_error'] ?? null,
        ]);

        return 'handled';
    }

    /**
     * Send a notice at most once per logical event.
     *
     * Stripe retries a failing invoice several times; without a key the seller
     * would get an identical mail on every attempt. The event key is recorded
     * for the same purpose on the webhook rows, and a send failure is logged
     * rather than allowed to fail the webhook itself.
     */
    private function notifyOnce(?\App\Models\User $user, string $eventKey, string $type): void
    {
        if (!$user) {
            return;
        }

        $alreadySent = \App\Models\StripeWebhookEvent::query()
            ->where('stripe_event_id', 'notification:' . $eventKey)
            ->exists();

        if ($alreadySent) {
            return;
        }

        app(\App\Services\SubscriptionNotifier::class)->notify(
            $user,
            $type,
            app(\App\Services\SubscriptionNotifier::class)->planContext($user),
        );

        // Record the send so a repeated event is a no-op.
        \App\Models\StripeWebhookEvent::firstOrCreate(
            ['stripe_event_id' => 'notification:' . $eventKey],
            [
                'type' => 'notification.' . $type,
                'status' => \App\Models\StripeWebhookEvent::PROCESSED,
                'processed_at' => now(),
            ]
        );
    }

    /** Only a settled invoice for the configured PRO price counts. */
    private function isGenuineProPayment(array $invoice): bool
    {
        $status = $invoice['status'] ?? null;
        $amountPaid = (int) ($invoice['amount_paid'] ?? 0);

        if ($status !== 'paid' || $amountPaid <= 0) {
            return false;
        }

        $priceId = config('services.stripe.pro_price_id');

        // When a price is configured, require it to appear on the invoice.
        if ($priceId) {
            foreach (($invoice['lines']['data'] ?? []) as $line) {
                if ($this->linePriceId($line) === $priceId) {
                    return true;
                }
            }

            return false;
        }

        return true;
    }

    /**
     * The price id on an invoice line, across API versions.
     *
     * Newer versions (e.g. the dahlia webhook version) move the price under
     * pricing.price_details and leave lines[].price empty. Reading only the old
     * location made every real payment look like a different product, so the
     * entitlement was silently never granted.
     *
     * @param  array<string, mixed>  $line
     */
    private function linePriceId(array $line): ?string
    {
        return $line['price']['id']
            ?? $line['pricing']['price_details']['price']
            ?? $line['plan']['id']
            ?? null;
    }

    private function findSubscription(array $subscriptionData): ?Subscription
    {
        $id = $subscriptionData['id'] ?? null;

        if ($id) {
            $found = Subscription::where('stripe_subscription_id', $id)->first();

            if ($found) {
                return $found;
            }
        }

        // Fall back to the seller id carried in metadata.
        $userId = $this->metaUserId($subscriptionData);

        if ($userId) {
            return Subscription::where('user_id', $userId)
                ->whereIn('status', Subscription::OPEN_STATUSES)
                ->latest('id')
                ->first();
        }

        return null;
    }

    private function subFromInvoice(array $invoice): ?Subscription
    {
        $subscriptionId = $this->subscriptionIdFromInvoice($invoice);

        return $subscriptionId
            ? Subscription::where('stripe_subscription_id', $subscriptionId)->first()
            : null;
    }

    /**
     * The subscription id on an invoice, across API versions.
     *
     * Older versions put it at the top level. Newer ones nest it under
     * parent.subscription_details, and the line item carries its own copy
     * under parent.subscription_item_details. Missing one of these shapes is
     * what silently drops a genuine payment, so all of them are checked.
     */
    private function subscriptionIdFromInvoice(array $invoice): ?string
    {
        return $invoice['subscription']
            // Newer API: the invoice's parent is a subscription.
            ?? $invoice['parent']['subscription_details']['subscription']
            ?? $invoice['parent']['subscription']['id']
            // Newer API: the line item's parent is a subscription item.
            ?? $invoice['lines']['data'][0]['parent']['subscription_item_details']['subscription']
            ?? $invoice['lines']['data'][0]['parent']['subscription_details']['subscription']
            ?? null;
    }

    private function metaUserId(array $object): ?int
    {
        $metadata = $object['metadata'] ?? [];
        $id = $metadata['gigapiac_user_id'] ?? null;

        return $id ? (int) $id : null;
    }

    private function timestamp(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        // Stripe sends unix seconds; durations/periods may arrive as strings.
        return is_numeric($value)
            ? Carbon::createFromTimestamp((int) $value)
            : Carbon::parse((string) $value);
    }
}

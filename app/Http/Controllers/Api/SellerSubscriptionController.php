<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BillingProfileRequest;
use App\Models\BillingProfile;
use App\Services\PlanService;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SellerSubscriptionController extends Controller
{
    public function __construct(
        private readonly StripeService $stripe,
        private readonly PlanService $plans,
    ) {
    }

    /**
     * Whether PRO checkout is available, and the seller's saved billing data.
     */
    public function state(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = BillingProfile::where('user_id', $user->id)->first();
        $live = $this->stripe->liveSubscription($user);

        return response()->json([
            'data' => [
                'checkout_available' => $this->stripe->isConfigured(),
                /*
                 * The UI disables the pay button until this is true. The same
                 * rule is enforced server-side, so the flag is a convenience,
                 * not the gate.
                 */
                'billing_complete' => $this->stripe->isBillingComplete($user),
                'has_live_subscription' => (bool) $live,
                'subscription_status' => $live?->status,
                'cancel_at_period_end' => (bool) $live?->cancel_at_period_end,
                'billing_profile' => $profile,
                'plan' => $this->plans->summaryFor($user),
            ],
        ]);
    }

    /**
     * Save (or update) the seller's billing identity.
     *
     * This is a snapshot used to prefill checkout; it never rewrites an
     * already-issued invoice.
     */
    public function saveBillingProfile(BillingProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        $profile = DB::transaction(function () use ($request, $user) {
            return BillingProfile::updateOrCreate(
                ['user_id' => $user->id],
                $request->validated()
            );
        });

        return response()->json([
            'message' => 'Számlázási adatok elmentve.',
            'data' => $profile,
        ]);
    }

    /**
     * Start the PRO checkout.
     *
     * The amount and price are server-side only. A seller who already has a
     * live or pending subscription is refused instead of being charged twice.
     */
    public function checkout(Request $request): JsonResponse
    {
        $user = $request->user();

        $session = $this->stripe->createProCheckoutSession(
            $user,
            url('/seller/subscription?checkout=success'),
            url('/seller/subscription?checkout=cancelled'),
        );

        return response()->json([
            'message' => 'Előfizetés indítása.',
            'checkout_url' => $session['url'],
        ]);
    }

    /**
     * Open the Stripe billing portal for this seller's own customer.
     */
    public function portal(Request $request): JsonResponse
    {
        $url = $this->stripe->createBillingPortalSession(
            $request->user(),
            url('/seller/subscription'),
        );

        return response()->json([
            'portal_url' => $url,
        ]);
    }
}

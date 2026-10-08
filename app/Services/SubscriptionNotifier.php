<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\SubscriptionNotification;
use Illuminate\Support\Facades\Log;

/*
 * Sends subscription notices, and never lets a mail failure undo a payment.
 *
 * The spec is explicit: a provider outage must not revoke a successful
 * business transaction. So every send is attempted after the transaction has
 * committed, and a failure is logged rather than rethrown.
 *
 * Notices are queued, and the queue connection is what makes a repeated
 * webhook harmless: the same period produces the same notification rows
 * because the caller only invokes this on a genuinely new period.
 */
class SubscriptionNotifier
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function notify(User $user, string $type, array $context = []): void
    {
        try {
            $user->notify(new SubscriptionNotification($type, $context));
        } catch (\Throwable $exception) {
            /*
             * The payment already succeeded; a mail problem is operational,
             * not a reason to fail the request or roll anything back.
             */
            Log::error('Subscription notification failed to send.', [
                'user_id' => $user->id,
                'type' => $type,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    /** The entitlement bundle, so every notice reports the same numbers. */
    public function planContext(User $user): array
    {
        $plans = app(PlanService::class);

        return [
            'max_active_listings' => $plans->maxActiveListings($user),
            'max_photos_per_listing' => $plans->maxPhotosPerListing($user),
            'listing_validity_days' => $plans->listingValidityDays($user),
            'bumps_per_period' => (int) $plans->limitFor($user, 'bumps_per_period'),
            'entitled_until' => $user->pro_entitled_until?->toIso8601String(),
        ];
    }
}

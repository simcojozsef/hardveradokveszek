<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\User;
use App\Services\StripeService;
use App\Services\SubscriptionPaymentService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/*
 * Periodic safety net for missed webhooks.
 *
 * Re-reads the live Stripe state and re-uses the same idempotent payment
 * service, so running this twice produces the same result as one delivery.
 * Entitlement is also expired here when the paid-through date has passed and
 * the scheduled expiry job never ran.
 */
class ReconcileStripeSubscriptions extends Command
{
    protected $signature = 'stripe:reconcile {--limit=50}';

    protected $description = 'Reconcile local subscription state against Stripe';

    public function handle(StripeService $stripe, SubscriptionPaymentService $payments): int
    {
        if (!$stripe->isConfigured()) {
            $this->warn('A Stripe nincs bekonfigurálva.');

            return self::SUCCESS;
        }

        $repaired = 0;

        Subscription::query()
            ->whereIn('status', Subscription::OPEN_STATUSES)
            ->latest('id')
            ->limit((int) $this->option('limit'))
            ->each(function (Subscription $local) use ($stripe, $payments, &$repaired) {
                if (!$local->stripe_subscription_id) {
                    return;
                }

                try {
                    $remote = $stripe->client()->subscriptions->retrieve(
                        $local->stripe_subscription_id
                    );
                } catch (\Throwable $exception) {
                    $this->warn("Nem olvasható: {$local->stripe_subscription_id}");

                    return;
                }

                $local->forceFill([
                    'status' => $remote->status,
                    'cancel_at_period_end' => (bool) $remote->cancel_at_period_end,
                    'current_period_start' => isset($remote->current_period_start)
                        ? Carbon::createFromTimestamp($remote->current_period_start)
                        : $local->current_period_start,
                    'current_period_end' => isset($remote->current_period_end)
                        ? Carbon::createFromTimestamp($remote->current_period_end)
                        : $local->current_period_end,
                ])->save();

                $repaired++;
            });

        /*
         * Never leave PRO active past the paid-through date, even if the
         * expiry job never ran.
         */
        $expired = User::query()
            ->whereNotNull('pro_entitled_until')
            ->where('pro_entitled_until', '<', now())
            ->update(['pro_entitled_until' => null]);

        $this->info("Egyeztetett előfizetés: {$repaired}");
        $this->info("Lejárt PRO jogosultság törölve: {$expired}");

        Log::info('Stripe reconciliation finished.', [
            'repaired' => $repaired,
            'expired_entitlements' => $expired,
        ]);

        return self::SUCCESS;
    }
}

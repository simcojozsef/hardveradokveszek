<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\PlanDowngradeService;
use Illuminate\Console\Command;

/*
 * Ends PRO for sellers whose paid period has passed.
 *
 * Entitlement is cleared first (the authoritative gate), then the downgrade
 * rebalances their listings. Running this twice is harmless: entitlement is
 * already null and the downgrade is idempotent.
 */
class ExpireProEntitlements extends Command
{
    protected $signature = 'plans:expire-pro {--limit=200}';

    protected $description = 'End lapsed PRO periods and rebalance their listings';

    public function handle(PlanDowngradeService $downgrades): int
    {
        $lapsed = User::query()
            ->whereNotNull('pro_entitled_until')
            ->where('pro_entitled_until', '<=', now())
            ->limit((int) $this->option('limit'))
            ->get();

        $downgraded = 0;

        foreach ($lapsed as $user) {
            // Keep the real end so the expiry clamp stays exact.
            $end = $user->pro_entitled_until;

            $user->forceFill(['pro_entitled_until' => null])->save();

            $result = $downgrades->downgrade($user->fresh(), $end);

            /*
             * Tell the seller once, on the run that actually rebalanced their
             * listings. A later run finds nothing to do and sends nothing, so
             * the notice cannot repeat.
             */
            if ($result['processed']) {
                $downgraded++;

                try {
                    $user->notify(new \App\Notifications\SubscriptionNotification(
                        \App\Notifications\SubscriptionNotification::ENDED,
                        [
                            'kept' => $result['kept'],
                            'archived' => $result['archived'],
                        ],
                    ));
                } catch (\Throwable $exception) {
                    \Illuminate\Support\Facades\Log::error(
                        'PRO ended notice failed.',
                        ['user_id' => $user->id, 'message' => $exception->getMessage()]
                    );
                }
            }
        }

        $this->info("Lejárt PRO: {$lapsed->count()}, visszaváltva: {$downgraded}");

        return self::SUCCESS;
    }
}

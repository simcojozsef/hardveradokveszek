<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

/*
 * Flags listings that enter their final 3 days.
 *
 * The actual email is wired in the notifications step; this command records
 * the single warning per listing so a repeated scheduler run cannot queue the
 * same notice twice.
 */
class SendListingExpiryWarnings extends Command
{
    protected $signature = 'products:warn-expiring';

    protected $description = 'Flag listings expiring within 3 days (one notice each)';

    public function handle(): int
    {
        $cutoff = now()->addDays(3);

        /*
         * Only active listings inside the window that have not been warned
         * yet. The conditional update is atomic, so concurrent runs cannot
         * both claim the same row.
         */
        /*
         * Collect the affected sellers BEFORE the marker is set, so each one
         * can be told how many of their listings are about to lapse. The
         * conditional update itself is atomic, so concurrent runs cannot both
         * claim the same row.
         */
        $due = Product::query()
            ->whereIn('listing_status', [Product::AVAILABLE, Product::IN_PROGRESS])
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->whereNull('expiry_warned_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $cutoff)
            ->where('expires_at', '>', now())
            ->with('store:id,user_id')
            ->get();

        if ($due->isEmpty()) {
            $this->info('Nincs lejárat-figyelmeztetésre váró hirdetés.');

            return self::SUCCESS;
        }

        $count = Product::query()
            ->whereIn('id', $due->pluck('id'))
            ->whereNull('expiry_warned_at')
            ->update(['expiry_warned_at' => now()]);

        /*
         * Group by seller so one mail reports all of their expiring listings
         * instead of one mail per product.
         */
        $due->groupBy(fn (Product $p) => $p->store?->user_id)
            ->filter()
            ->each(function ($items, $userId) {
                $user = \App\Models\User::find($userId);

                if (!$user) {
                    return;
                }

                $next = $items->min('expires_at');

                try {
                    $user->notify(new \App\Notifications\ListingExpiringNotification(
                        $items->count(),
                        $next?->timezone('Europe/Budapest')->format('Y. m. d.'),
                    ));
                } catch (\Throwable $exception) {
                    // A mail problem must not fail the scheduler run.
                    \Illuminate\Support\Facades\Log::error(
                        'Listing expiry notice failed.',
                        ['user_id' => $userId, 'message' => $exception->getMessage()]
                    );
                }
            });

        $this->info("Lejárat-figyelmeztetésre jelölt hirdetés: {$count}");

        return self::SUCCESS;
    }
}

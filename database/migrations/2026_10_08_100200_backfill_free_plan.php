<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
 * Migration rule from the spec:
 *  - every current seller becomes free (pro_entitled_until stays NULL)
 *  - nothing is deleted or archived
 *  - existing active listings expire 30 days from a fixed cut-over timestamp
 *  - sellers already above the free cap get a one-time grace marker so their
 *    existing listings survive to that date, while new publishes stay capped
 *
 * Re-running must not extend anything, so the cut-over instant is written
 * explicitly as a fixed value rather than "now" per execution.
 */
return new class extends Migration
{
    /** Fixed cut-over moment: 2026-10-08 00:00:00 UTC. */
    private const CUT_OVER = '2026-10-08 00:00:00';

    public function up(): void
    {
        $cutOver = Carbon::parse(self::CUT_OVER, 'UTC');
        $freeWindowEnd = $cutOver->copy()->addDays(30);

        // Existing sellers are free.
        User::query()->update([
            'pro_entitled_until' => null,
            'plan_migration_grace_until' => null,
        ]);

        /*
         * Only listings that are currently publicly visible are touched. Sold,
         * archived and draft rows keep their own timestamps; the window is
         * clamped so an already-sooner expiry is never pushed later.
         */
        Product::query()
            ->whereIn('listing_status', [Product::AVAILABLE, Product::IN_PROGRESS])
            ->whereNull('deleted_at')
            ->where(function ($query) use ($freeWindowEnd) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', $freeWindowEnd);
            })
            ->update(['expires_at' => $freeWindowEnd]);

        /*
         * One-time grace: a seller with more than 10 listings that would count
         * as active keeps them until they expire. No new publish may exceed 10.
         */
        $overCap = DB::table('products')
            ->join('stores', 'products.store_id', '=', 'stores.id')
            ->where('products.is_active', true)
            ->where('products.stock', '>', 0)
            ->whereIn('products.listing_status', [Product::AVAILABLE, Product::IN_PROGRESS])
            ->whereNull('products.deleted_at')
            ->where('products.expires_at', '>', $cutOver)
            ->groupBy('stores.user_id')
            ->havingRaw('COUNT(*) > 10')
            ->pluck('stores.user_id');

        if ($overCap->isNotEmpty()) {
            User::query()
                ->whereIn('id', $overCap)
                ->update(['plan_migration_grace_until' => $freeWindowEnd]);
        }
    }

    public function down(): void
    {
        // The entitlement columns are dropped by the sibling migration.
    }
};

<?php

namespace App\Services;

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/*
 * Converts a seller from PRO back to the free plan.
 *
 * The rules, from the spec:
 *  - at most 10 listings stay active
 *  - the seller may pre-select which ones; those win if they are still active
 *  - the rest of the 10 places fill with the most recently published active
 *    listings, ties broken by descending product id
 *  - bumps never influence this
 *  - the surplus is archived with a reason; images, content and conversations
 *    are NOT deleted
 *  - a kept listing expires at min(now + 30 days, PRO end + 30 days), so a
 *    late scheduler run cannot hand out extra days
 *
 * Safe to run repeatedly: the result is the same on the second pass.
 */
class PlanDowngradeService
{
    /** Why a listing was taken offline by the plan rules. */
    public const REASON_PLAN_LIMIT = 'archived_plan_limit';

    private const KEEP = 10;

    public function __construct(
        private readonly ListingLimitService $limits,
    ) {
    }

    /**
     * Run the downgrade for one seller.
     *
     * @return array{kept:int, archived:int, processed:bool}
     */
    public function downgrade(User $user, ?\DateTimeInterface $entitlementEnd = null): array
    {
        return $this->limits->withSellerLock($user, function (User $locked) use ($entitlementEnd) {
            $fresh = $locked->fresh();

            /*
             * If PRO is still valid there is nothing to do. The guard makes a
             * concurrent renewal win over a stale downgrade trigger.
             */
            if (app(PlanService::class)->isPro($fresh)) {
                return ['kept' => 0, 'archived' => 0, 'processed' => false];
            }

            /*
             * A seller who never had more listings than the free cap has
             * nothing to rebalance — do not touch their data.
             */
            $active = $this->activeListings($fresh);

            if ($active->count() <= self::KEEP) {
                $this->reconcileExpiries($fresh, $active, $entitlementEnd);

                return ['kept' => $active->count(), 'archived' => 0, 'processed' => false];
            }

            $keepIds = $this->resolveKeepIds($fresh, $active);
            $surplus = $active->reject(fn (Product $p) => in_array($p->id, $keepIds, true));

            foreach ($surplus as $product) {
                $this->archive($product);
            }

            $this->reconcileExpiries(
                $fresh,
                $active->filter(fn (Product $p) => in_array($p->id, $keepIds, true)),
                $entitlementEnd,
            );

            Log::info('PRO downgrade applied.', [
                'user_id' => $fresh->id,
                'kept' => count($keepIds),
                'archived' => $surplus->count(),
            ]);

            return [
                'kept' => count($keepIds),
                'archived' => $surplus->count(),
                'processed' => true,
            ];
        });
    }

    /**
     * The listing ids that survive, in priority order.
     *
     * @param  \Illuminate\Support\Collection<int, Product>  $active
     * @return array<int, int>
     */
    private function resolveKeepIds(User $user, $active): array
    {
        // 1. The seller's own selection, filtered to listings still active.
        $selected = DB::table('plan_retention_selections')
            ->where('user_id', $user->id)
            ->orderBy('position')
            ->pluck('product_id')
            ->all();

        $activeIds = $active->pluck('id')->all();
        $keep = array_values(array_intersect($selected, $activeIds));
        $keep = array_slice($keep, 0, self::KEEP);

        if (count($keep) >= self::KEEP) {
            return $keep;
        }

        /*
         * 2. Fill the remaining places deterministically: newest published
         * first, ties broken by descending id. bumped_at plays no part.
         */
        $remaining = $active
            ->reject(fn (Product $p) => in_array($p->id, $keep, true))
            ->sortByDesc(fn (Product $p) => sprintf(
                '%010d-%010d',
                $p->posted_at?->timestamp ?? 0,
                $p->id
            ))
            ->take(self::KEEP - count($keep))
            ->pluck('id')
            ->all();

        return array_values(array_merge($keep, $remaining));
    }

    /**
     * Clamp the kept listings' expiry.
     *
     * min(now + free window, entitlement end + free window). Using the real
     * entitlement end means a late run cannot extend anything.
     *
     * @param  \Illuminate\Support\Collection<int, Product>  $kept
     */
    private function reconcileExpiries(
        User $user,
        $kept,
        ?\DateTimeInterface $entitlementEnd,
    ): void {
        $freeDays = app(PlanService::class)->listingValidityDays($user);
        $fromNow = now()->addDays($freeDays);

        $cap = $entitlementEnd
            ? \Illuminate\Support\Carbon::instance($entitlementEnd)->addDays($freeDays)
            : $fromNow;

        $target = $fromNow->lessThan($cap) ? $fromNow : $cap;

        foreach ($kept as $product) {
            // Only ever shorten; a sooner expiry is already correct.
            if ($product->expires_at === null || $product->expires_at->greaterThan($target)) {
                Product::whereKey($product->id)->update(['expires_at' => $target]);
            }
        }
    }

    /**
     * Take a listing offline without deleting anything.
     *
     * Images, description and conversations all remain; only visibility and
     * the reason change, so the seller can reactivate by hand later.
     */
    private function archive(Product $product): void
    {
        Product::whereKey($product->id)->update([
            'listing_status' => Product::EXPIRED,
            'is_active' => false,
            'archived_reason' => self::REASON_PLAN_LIMIT,
            'archived_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** @return \Illuminate\Support\Collection<int, Product> */
    private function activeListings(User $user)
    {
        $store = $user->store;

        if (!$store) {
            return collect();
        }

        return $store->products()
            ->where('is_active', true)
            ->where('stock', '>', 0)
            ->whereIn('listing_status', [Product::AVAILABLE, Product::IN_PROGRESS])
            ->where('expires_at', '>', now())
            ->orderByDesc('posted_at')
            ->orderByDesc('id')
            ->get();
    }
}

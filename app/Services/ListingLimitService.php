<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/*
 * The only place that decides whether a listing or a photo may be added.
 *
 * Every write path (create, publish, reactivate, renew, bulk, import) calls
 * these methods, so the limits cannot drift between controllers. The counts
 * are taken inside the caller's transaction with a per-seller lock, which is
 * what keeps two concurrent requests from both fitting into the last slot.
 */
class ListingLimitService
{
    public function __construct(
        private readonly PlanService $plans,
    ) {
    }

    /**
     * Serialise limit checks for one seller.
     *
     * A row lock on the user is the cheapest seller-scoped mutex: every path
     * that can change the active count must take it before counting.
     */
    public function lockSeller(User $user): User
    {
        return User::query()
            ->whereKey($user->id)
            ->lockForUpdate()
            ->firstOrFail();
    }

    /**
     * Assert the store may publish $incoming additional active listings.
     *
     * @throws ValidationException
     */
    public function assertCanActivate(User $user, int $incoming = 1): void
    {
        /*
         * Lazy enforcement runs from the callers' entry point (see
         * enforceLapsedPlanAtEntry) rather than here: this method is called
         * from inside the seller lock, and a nested transaction cannot see
         * the outer one's uncommitted writes, so a downgrade triggered here
         * would not be visible to the count below.
         */
        $max = $this->plans->maxActiveListings($user);
        $used = $this->countActive($user);

        if ($used + $incoming > $max) {
            throw ValidationException::withMessages([
                'plan' => sprintf(
                    'Elérted a csomagban elérhető aktív hirdetések számát (%d). '
                    . 'Aktiváláshoz szüntess meg hirdetést, vagy válts PRO csomagra.',
                    $max
                ),
            ]);
        }
    }

    /**
     * Active listings consume a slot. Mirrors PlanService so there is one
     * definition of "active": published, in stock, not sold, not expired.
     */
    public function countActive(User $user): int
    {
        return $this->plans->activeListingCount($user);
    }

    /**
     * Assert a listing may hold $incoming more photos.
     *
     * The cover image counts toward the same cap, so a free plan allows
     * 1 cover + 5 gallery images.
     *
     * @throws ValidationException
     */
    public function assertCanAddPhotos(User $user, Product $product, int $incoming = 1): void
    {
        $max = $this->plans->maxPhotosPerListing($user);
        $current = $product->images()->count();
        $final = $current + $incoming;

        /*
         * An existing over-limit listing (from a previous PRO period) may keep
         * its photos, replace them one-for-one and delete them, but it may not
         * grow beyond the cap.
         */
        if ($final > $max) {
            throw ValidationException::withMessages([
                'image' => sprintf(
                    'Ezen a csomagon legfeljebb %d fotó lehet egy hirdetésen '
                    . '(jelenleg %d).',
                    $max,
                    $current
                ),
            ]);
        }
    }

    /**
     * Whether adding a photo would exceed the cap. Used by the UI to disable
     * the control before the request is made.
     */
    public function canAddPhoto(User $user, Product $product): bool
    {
        return $product->images()->count()
            < $this->plans->maxPhotosPerListing($user);
    }

    /**
     * Run $work inside a transaction that already holds the seller lock.
     *
     * Any path that activates listings (create, renew, reactivate, bulk,
     * import) wraps itself in this so the check and the write are atomic.
     *
     * @template T
     * @param  callable(User): T  $work
     * @return T
     */
    public function withSellerLock(User $user, callable $work)
    {
        return DB::transaction(function () use ($user, $work) {
            $locked = $this->lockSeller($user);

            return $work($locked);
        });
    }

    /**
     * Apply a pending downgrade on first contact.
     *
     * Called from every entry point that can add an active listing, so the
     * rule holds even when the scheduler is late or never ran. Idempotent, and
     * a no-op for an active PRO seller.
     *
     * Must run BEFORE withSellerLock: it opens its own transaction, and a
     * nested one would not see its sibling's uncommitted writes.
     *
     * @return bool whether a downgrade was applied now
     */
    public function enforceLapsedPlan(User $user): bool
    {
        /** @var PlanDowngradeService $downgrades */
        $downgrades = app(PlanDowngradeService::class);

        return $downgrades->downgrade($user)['processed'];
    }

    /**
     * Entry point for paths that add an active listing.
     *
     * Runs the lazy downgrade first, then performs the limit check under the
     * seller lock, on freshly read state.
     *
     * @template T
     * @param  callable(User): T  $work
     * @return T
     */
    public function withActiveListingGuard(User $user, callable $work, int $incoming = 1)
    {
        // 1. Settle any lapsed plan outside the lock, so its writes commit
        //    and are visible to the check that follows.
        $this->enforceLapsedPlan($user);

        // 2. Check and act atomically on the now-correct state.
        return $this->withSellerLock($user, function (User $locked) use ($work, $incoming) {
            $this->assertCanActivate($locked, $incoming);

            return $work($locked);
        });
    }

    /**
     * A listing only needs a slot when it is publicly active.
     */
    public function consumesSlot(Product $product): bool
    {
        return $product->is_active
            && $product->stock > 0
            && in_array($product->effectiveListingStatus(), [
                Product::AVAILABLE,
                Product::IN_PROGRESS,
            ], true);
    }

    /**
     * Store-scoped variant used when a seller has a store but the caller only
     * holds the store model.
     */
    public function assertStoreCanActivate(Store $store, int $incoming = 1): void
    {
        if (!$store->user) {
            throw ValidationException::withMessages([
                'plan' => 'Az üzlethez nem tartozik eladói fiók.',
            ]);
        }

        $this->assertCanActivate($store->user, $incoming);
    }
}

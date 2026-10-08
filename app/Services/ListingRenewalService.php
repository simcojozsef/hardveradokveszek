<?php

namespace App\Services;

use App\Models\Product;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/*
 * Renewal and reactivation of a listing.
 *
 * Rules enforced here (from the approved spec):
 *  - the seller must confirm the product is still available
 *  - the new window is now + the CURRENT plan's limit, never extended from the
 *    previous expiry
 *  - renewal is not a bump: bumped_at is untouched
 *  - a sold or moderated listing cannot be revived this way
 *  - the active-slot limit is re-checked inside the seller lock
 */
class ListingRenewalService
{
    public function __construct(
        private readonly PlanService $plans,
        private readonly ListingLimitService $limits,
    ) {
    }

    /**
     * @throws ValidationException
     */
    public function renew(User $user, Product $product, bool $availableConfirmed): Product
    {
        if (!$this->belongsTo($user, $product)) {
            throw ValidationException::withMessages([
                'product' => 'Ez a hirdetés nem a te terméked.',
            ]);
        }

        if (!$availableConfirmed) {
            throw ValidationException::withMessages([
                'available_confirmed' => 'Megerősítem, hogy a termék még elérhető.',
            ]);
        }

        $effective = $product->effectiveListingStatus();

        // Sold and moderated listings are out of scope for renewal.
        if (in_array($effective, [Product::SOLD, Product::REMOVED], true)) {
            throw ValidationException::withMessages([
                'listing_status' => 'Eladott vagy eltávolított hirdetés nem újítható meg.',
            ]);
        }

        /*
         * Reactivating an expired listing adds an active slot, so it must fit
         * the plan. An already-active renewal keeps its slot and needs no
         * extra room.
         */
        $wasActive = $this->limits->consumesSlot($product);
        $willBeActive = $product->is_active && $product->stock > 0;

        return $this->limits->withSellerLock($user, function (User $locked) use ($product, $wasActive, $willBeActive) {
            if (!$wasActive && $willBeActive) {
                $this->limits->assertCanActivate($locked);
            }

            $fresh = Product::query()
                ->whereKey($product->id)
                ->lockForUpdate()
                ->firstOrFail();

            // now + current plan limit; never the old expiry plus days.
            $fresh->expires_at = now()->addDays(
                $this->plans->listingValidityDays($locked)
            );
            $fresh->listing_status = Product::AVAILABLE;
            $fresh->expired_at = null;
            $fresh->archived_reason = null;
            $fresh->archived_at = null;
            // A fresh window earns a fresh expiry notice.
            $fresh->expiry_warned_at = null;
            $fresh->save();

            return $fresh;
        });
    }

    /** Reopening an archived-by-plan listing is a manual act, same guardrails. */
    public function reactivate(User $user, Product $product, bool $availableConfirmed): Product
    {
        return $this->renew($user, $product, $availableConfirmed);
    }

    private function belongsTo(User $user, Product $product): bool
    {
        return $product->store !== null
            && (int) $product->store->user_id === (int) $user->id;
    }
}

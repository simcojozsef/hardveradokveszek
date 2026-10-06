<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductListingLifecycle
{
    /** Statuses a seller may explicitly move a listing to. */
    public const SELLER_TARGETS = [Product::AVAILABLE, Product::IN_PROGRESS, Product::SOLD];

    /**
     * Single source of truth for listing-status transitions.
     *
     * Resolves the effective status (which accounts for the 60-day expiry
     * window) and rejects anything that may not be edited, so every write
     * path shares the same guard instead of re-implementing it.
     *
     * @return bool true when the caller should persist $next
     *
     * @throws ValidationException
     */
    public function resolveTransition(Product $product, string $next): bool
    {
        if (!in_array($next, self::SELLER_TARGETS, true)) {
            throw ValidationException::withMessages(['listing_status' => 'Érvénytelen állapot.']);
        }

        $current = $product->effectiveListingStatus();

        // Repeat requests preserve sold_at. Sold and expired listings cannot be reopened here.
        if ($current === $next) {
            return false;
        }

        if (!in_array($current, [Product::AVAILABLE, Product::IN_PROGRESS], true)) {
            throw ValidationException::withMessages([
                'listing_status' => 'Eladott vagy lejárt termék állapota nem módosítható.',
            ]);
        }

        return true;
    }

    public function changeStatus(Product $product, string $next): Product
    {
        return DB::transaction(function () use ($product, $next) {
            $locked = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();

            if (!$this->resolveTransition($locked, $next)) {
                return $locked;
            }

            $locked->listing_status = $next;
            if ($next === Product::SOLD) $locked->sold_at = now();
            $locked->save();
            return $locked;
        });
    }

    public function remove(Product $product): Product
    {
        return DB::transaction(function () use ($product) {
            $locked = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $locked->listing_status = Product::REMOVED;
            $locked->save();
            $locked->delete();
            return $locked;
        });
    }

    public function expireDue(): int
    {
        // Atomic conditional update: cannot overwrite a concurrent sold/removed state.
        return Product::query()->whereIn('listing_status', [Product::AVAILABLE, Product::IN_PROGRESS])
            ->where('expires_at', '<=', now())
            ->update([
                'listing_status' => Product::EXPIRED,
                'expired_at' => DB::raw('expires_at'),
                'updated_at' => now(),
            ]);
    }
}

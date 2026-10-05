<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductListingLifecycle
{
    public function changeStatus(Product $product, string $next): Product
    {
        return DB::transaction(function () use ($product, $next) {
            $locked = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $current = $locked->effectiveListingStatus();
            if (!in_array($next, [Product::AVAILABLE, Product::IN_PROGRESS, Product::SOLD], true)) {
                throw ValidationException::withMessages(['listing_status' => 'Érvénytelen állapot.']);
            }
            // Repeat requests preserve sold_at. Sold and expired listings cannot be reopened here.
            if ($current === $next) return $locked;
            if (!in_array($current, [Product::AVAILABLE, Product::IN_PROGRESS], true)) {
                throw ValidationException::withMessages([
                    'listing_status' => 'Eladott vagy lejárt termék állapota nem módosítható.',
                ]);
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

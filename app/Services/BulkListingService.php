<?php

namespace App\Services;

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/*
 * PRO bulk operations on a seller's own listings.
 *
 * Shared rules:
 *  - at most 100 distinct listings per operation
 *  - PRO is re-checked at execution time, not when the page was rendered
 *  - the whole operation runs in one transaction: a single bad or foreign id
 *    means NOTHING changes
 *  - every id is verified to belong to the caller before anything is written
 *
 * Renewal and price/stock editing are separate entry points because they
 * enforce different rules, but both go through the same validation and the
 * same one-transaction guarantee.
 */
class BulkListingService
{
    public const MAX_ROWS = 100;

    public function __construct(
        private readonly PlanService $plans,
        private readonly ListingLimitService $limits,
    ) {
    }

    /**
     * Bulk renewal.
     *
     * Every affected listing gets now + the CURRENT plan window, and bumped_at
     * is deliberately untouched: renewal is not a pre-reservation.
     *
     * @param  array<int, int>  $productIds
     * @return array{renewed:int, ids:array<int, int>}
     */
    public function renew(User $user, array $productIds, bool $availableConfirmed): array
    {
        $ids = $this->normalizeIds($productIds);

        $this->assertPro($user, 'A tömeges megújítás PRO csomaghoz tartozik.');

        if (!$availableConfirmed) {
            throw ValidationException::withMessages([
                'available_confirmed' => 'Megerősítem, hogy az összes kijelölt termék még elérhető.',
            ]);
        }

        $products = $this->ownedProducts($user, $ids);
        $this->assertAllFound($ids, $products);

        // Sold and moderated listings may not be revived this way.
        foreach ($products as $product) {
            if (in_array($product->effectiveListingStatus(), [Product::SOLD, Product::REMOVED], true)) {
                throw ValidationException::withMessages([
                    'product_ids' => sprintf(
                        'A(z) "%s" eladott vagy eltávolított, ezért nem újítható meg.',
                        $product->name
                    ),
                ]);
            }
        }

        $freeDays = $this->plans->listingValidityDays($user);

        return $this->limits->withSellerLock($user, function (User $locked) use ($ids, $freeDays) {
            /*
             * A bulk renewal can reactivate listings that were not consuming a
             * slot, so the resulting active count must fit the plan. Counted
             * once, for the whole batch.
             */
            $now = now();
            $target = $now->copy()->addDays($freeDays);

            $becomingActive = Product::query()
                ->whereIn('id', $ids)
                ->where('is_active', true)
                ->where('stock', '>', 0)
                ->whereIn('listing_status', [Product::AVAILABLE, Product::IN_PROGRESS])
                ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '<=', $now))
                ->count();

            $this->limits->assertCanActivate($locked, $becomingActive);

            Product::query()
                ->whereIn('id', $ids)
                ->update([
                    'expires_at' => $target,
                    'listing_status' => Product::AVAILABLE,
                    'expired_at' => null,
                    'archived_reason' => null,
                    'archived_at' => null,
                    'expiry_warned_at' => null,
                    'updated_at' => $now,
                ]);

            return ['renewed' => count($ids), 'ids' => $ids];
        });
    }

    /**
     * Bulk price and stock edit.
     *
     * Per product: an optional integer price and an optional non-negative
     * integer stock. Only the fields actually submitted change, so a stock of
     * 0 is never mistaken for "field omitted".
     *
     * @param  array<int, array{id:int, price?:int|null, stock?:int|null}>  $rows
     * @return array{updated:int, ids:array<int, int>}
     */
    public function updatePriceStock(User $user, array $rows): array
    {
        $this->assertPro($user, 'A tömeges módosítás PRO csomaghoz tartozik.');

        if (count($rows) > self::MAX_ROWS) {
            throw ValidationException::withMessages([
                'rows' => sprintf('Egyszerre legfeljebb %d termék módosítható.', self::MAX_ROWS),
            ]);
        }

        $normalized = [];
        $ids = [];

        foreach ($rows as $row) {
            $id = (int) ($row['id'] ?? 0);

            if ($id <= 0) {
                throw ValidationException::withMessages(['rows' => 'Érvénytelen termékazonosító.']);
            }

            $price = array_key_exists('price', $row) && $row['price'] !== null
                ? (int) $row['price']
                : null;

            $stock = array_key_exists('stock', $row) && $row['stock'] !== null
                ? (int) $row['stock']
                : null;

            if ($price !== null && $price < 0) {
                throw ValidationException::withMessages([
                    'rows' => sprintf('A(z) #%d termék ára nem lehet negatív.', $id),
                ]);
            }

            if ($stock !== null && $stock < 0) {
                throw ValidationException::withMessages([
                    'rows' => sprintf('A(z) #%d termék készlete nem lehet negatív.', $id),
                ]);
            }

            $normalized[] = ['id' => $id, 'price' => $price, 'stock' => $stock];
            $ids[] = $id;
        }

        $ids = $this->normalizeIds($ids);
        $products = $this->ownedProducts($user, $ids);
        $this->assertAllFound($ids, $products);

        /*
         * Raising stock can bring a listing back to life, which consumes a
         * slot — so the resulting active count is checked for the batch.
         */
        return $this->limits->withSellerLock($user, function (User $locked) use ($normalized, $ids) {
            $becomingActive = 0;

            foreach ($normalized as $row) {
                if ($row['stock'] === null || $row['stock'] <= 0) {
                    continue;
                }

                $current = Product::find($row['id']);

                if ($current && $current->stock <= 0 && $current->is_active) {
                    $becomingActive++;
                }
            }

            if ($becomingActive > 0) {
                $this->limits->assertCanActivate($locked, $becomingActive);
            }

            foreach ($normalized as $row) {
                $update = ['updated_at' => now()];

                // Only submitted fields change; omission means "leave alone".
                if ($row['price'] !== null) {
                    $update['price'] = $row['price'];
                }

                if ($row['stock'] !== null) {
                    $update['stock'] = $row['stock'];
                }

                if (count($update) === 1) {
                    continue;
                }

                Product::whereKey($row['id'])->update($update);
            }

            return ['updated' => count($ids), 'ids' => $ids];
        });
    }

    /** Distinct, ordered ids, capped at the row limit. */
    private function normalizeIds(array $productIds): array
    {
        $ids = array_values(array_unique(array_map('intval', $productIds)));

        if ($ids === []) {
            throw ValidationException::withMessages([
                'product_ids' => 'Jelölj ki legalább egy terméket.',
            ]);
        }

        if (count($ids) > self::MAX_ROWS) {
            throw ValidationException::withMessages([
                'product_ids' => sprintf('Egyszerre legfeljebb %d termék kezelhető.', self::MAX_ROWS),
            ]);
        }

        return $ids;
    }

    /**
     * Load the requested listings, restricted to the caller's own store.
     *
     * @param  array<int, int>  $ids
     * @return \Illuminate\Support\Collection<int, Product>
     */
    private function ownedProducts(User $user, array $ids)
    {
        $storeId = $user->store?->id;

        if (!$storeId) {
            throw ValidationException::withMessages([
                'product_ids' => 'Nincs üzleted.',
            ]);
        }

        return Product::query()
            ->whereIn('id', $ids)
            ->where('store_id', $storeId)
            ->with('store')
            ->get();
    }

    /**
     * Any id that is not the seller's own listing aborts the whole operation.
     *
     * @param  array<int, int>  $ids
     */
    private function assertAllFound(array $ids, $products): void
    {
        $found = $products->pluck('id')->all();
        $foreign = array_diff($ids, $found);

        if ($foreign !== []) {
            throw ValidationException::withMessages([
                'product_ids' => 'Csak a saját termékeidet módosíthatod.',
            ]);
        }
    }

    private function assertPro(User $user, string $message): void
    {
        if (!$this->plans->isPro($user)) {
            throw ValidationException::withMessages(['plan' => $message]);
        }
    }
}

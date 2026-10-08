<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImport;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/*
 * Turns a parsed file into a preview, then (on approval) into products.
 *
 * Two modes:
 *   create       - new products are always created as DRAFTS, in one
 *                  transaction; any bad row means nothing is imported
 *   price_stock  - updates existing listings by seller_sku using the same
 *                  bulk service as the manual bulk edit
 *
 * The preview and commit are separate requests, tied together by a content
 * fingerprint so a tampered or swapped preview is rejected.
 */
class ProductImportService
{
    public function __construct(
        private readonly ProductImportParser $parser,
        private readonly BulkListingService $bulk,
    ) {
    }

    /**
     * Parse the upload and store a preview.
     *
     * @return array{import:ProductImport, preview:array<string,mixed>}
     */
    public function preview(User $user, UploadedFile $file, string $mode): array
    {
        $this->assertPro($user);
        $this->assertMode($mode);

        /*
         * Each mode only needs its own columns: a price/stock update never
         * mentions name or category, so requiring them would reject a valid
         * update file.
         */
        $parsed = $this->parser->parse(
            $file,
            $mode === ProductImport::MODE_PRICE_STOCK
                ? ProductImportParser::REQUIRED_COLUMNS_PRICE_STOCK
                : ProductImportParser::REQUIRED_COLUMNS,
        );

        $validated = $mode === ProductImport::MODE_CREATE
            ? $this->validateCreateRows($user, $parsed['rows'])
            : $this->validatePriceStockRows($user, $parsed['rows']);

        $import = ProductImport::create([
            'user_id' => $user->id,
            'mode' => $mode,
            'content_fingerprint' => $this->fingerprint($parsed['rows']),
            'row_count' => count($parsed['rows']),
            'valid_count' => $validated['valid_count'],
            'error_count' => count($validated['errors']),
            'status' => ProductImport::PENDING,
            'rows' => $parsed['rows'],
            'errors' => $validated['errors'],
            'expires_at' => now()->addDay(),
        ]);

        return [
            'import' => $import,
            'preview' => [
                'id' => $import->id,
                'mode' => $mode,
                'fingerprint' => $import->content_fingerprint,
                'row_count' => $import->row_count,
                'valid_count' => $import->valid_count,
                'error_count' => $import->error_count,
                'can_commit' => $import->error_count === 0,
                'warnings' => $parsed['warnings'],
                'rows' => $parsed['rows'],
                'errors' => $validated['errors'],
            ],
        ];
    }

    /**
     * Commit a previewed import.
     *
     * Re-checks PRO and ownership, verifies the fingerprint and the expiry,
     * then writes everything in one transaction.
     *
     * @return array{created:int|updated:int}
     */
    public function commit(User $user, ProductImport $import, string $fingerprint): array
    {
        $this->assertPro($user);

        if ($import->user_id !== $user->id) {
            throw ValidationException::withMessages(['import' => 'Ez az import nem a tiéd.']);
        }

        if ($import->status === ProductImport::COMMITTED) {
            // Repeated commit of the same preview is a no-op, not a duplicate.
            return $import->mode === ProductImport::MODE_CREATE
                ? ['created' => 0]
                : ['updated' => 0];
        }

        if ($import->isExpired()) {
            $import->forceFill(['status' => 'expired'])->save();

            throw ValidationException::withMessages([
                'import' => 'Az előnézet lejárt. Töltsd fel újra a fájlt.',
            ]);
        }

        if ($import->content_fingerprint !== $fingerprint) {
            throw ValidationException::withMessages([
                'import' => 'Az előnézet adatai megváltoztak. Töltsd fel újra a fájlt.',
            ]);
        }

        if ($import->error_count > 0) {
            throw ValidationException::withMessages([
                'import' => 'Hibás sorok vannak a fájlban, az import nem indítható.',
            ]);
        }

        return $import->mode === ProductImport::MODE_CREATE
            ? $this->commitCreate($user, $import)
            : $this->commitPriceStock($user, $import);
    }

    /**
     * Create drafts from the parsed rows, all or nothing.
     *
     * @return array{created:int}
     */
    private function commitCreate(User $user, ProductImport $import): array
    {
        $store = $user->store;

        if (!$store) {
            throw ValidationException::withMessages(['import' => 'Nincs üzleted.']);
        }

        $rows = $import->rows ?? [];

        // Re-validate at commit time: the world may have changed since preview.
        $recheck = $this->validateCreateRows($user, $rows);

        if ($recheck['valid_count'] !== count($rows)) {
            throw ValidationException::withMessages([
                'import' => 'Az adatok megváltoztak az előnézet óta. Töltsd fel újra a fájlt.',
            ]);
        }

        $created = DB::transaction(function () use ($store, $rows, $import) {
            $count = 0;

            foreach ($rows as $row) {
                $product = $store->products()->create([
                    'name' => trim((string) $row['name']),
                    'slug' => $this->uniqueSlug($store->id, (string) $row['name']),
                    'description' => trim((string) ($row['description'] ?? '')),
                    'category_id' => (int) $row['category_id'],
                    'price' => (int) $row['price_huf'],
                    'stock' => (int) $row['stock'],
                    /*
                     * Draft on purpose: images and full validation still have
                     * to happen before it can be published, so nothing goes
                     * live from a spreadsheet alone.
                     */
                    'is_active' => false,
                    'listing_status' => Product::AVAILABLE,
                    'listing_type' => 'offer',
                    'contains_ai' => false,
                ]);

                $product->forceFill(['seller_sku' => trim((string) $row['seller_sku'])])->save();
                $count++;
            }

            $import->forceFill([
                'status' => ProductImport::COMMITTED,
                'committed_at' => now(),
            ])->save();

            return $count;
        });

        return ['created' => $created];
    }

    /**
     * Update existing listings by seller_sku, reusing the bulk service.
     *
     * @return array{updated:int}
     */
    private function commitPriceStock(User $user, ProductImport $import): array
    {
        $rows = $import->rows ?? [];

        // Same validation as the manual bulk edit: ownership, values, one
        // transaction, and the same active-slot re-check.
        $mapped = $this->mapPriceStockRows($user, $rows);

        $result = $this->bulk->updatePriceStock($user, $mapped['rows']);

        $import->forceFill([
            'status' => ProductImport::COMMITTED,
            'committed_at' => now(),
        ])->save();

        return ['updated' => $result['updated']];
    }

    /**
     * Per-row validation for the create mode.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{valid_count:int, errors:array<int, array<string, mixed>>}
     */
    private function validateCreateRows(User $user, array $rows): array
    {
        $errors = [];
        $seenSkus = [];
        $valid = 0;

        // Existing SKUs of this seller, to catch a collision before writing.
        $existing = Product::query()
            ->join('stores', 'products.store_id', '=', 'stores.id')
            ->where('stores.user_id', $user->id)
            ->whereNotNull('products.seller_sku')
            ->pluck('products.seller_sku')
            ->map(fn ($sku) => strtolower((string) $sku))
            ->all();

        $existingMap = array_flip($existing);

        foreach ($rows as $index => $row) {
            $line = $index + 2; // header is line 1
            $rowErrors = [];

            $sku = strtolower(trim((string) ($row['seller_sku'] ?? '')));

            if ($sku === '') {
                $rowErrors[] = 'A seller_sku kötelező.';
            } elseif (isset($seenSkus[$sku])) {
                $rowErrors[] = 'A seller_sku a fájlon belül ismétlődik.';
            } elseif (isset($existingMap[$sku])) {
                $rowErrors[] = 'Ez a seller_sku már létezik a termékeid között.';
            }

            if (trim((string) ($row['name'] ?? '')) === '') {
                $rowErrors[] = 'A név kötelező.';
            }

            $categoryId = (int) ($row['category_id'] ?? 0);

            if ($categoryId <= 0 || !Category::whereKey($categoryId)->exists()) {
                $rowErrors[] = 'A kategória azonosító nem létezik.';
            }

            if (!$this->isWholeHuf($row['price_huf'] ?? null)) {
                $rowErrors[] = 'Az ár egész forint kell legyen, ezreselválasztó nélkül.';
            }

            if (!$this->isNonNegativeInt($row['stock'] ?? null)) {
                $rowErrors[] = 'A készlet nem negatív egész szám kell legyen.';
            }

            if ($rowErrors !== []) {
                $errors[] = ['line' => $line, 'sku' => $sku, 'messages' => $rowErrors];

                continue;
            }

            $seenSkus[$sku] = true;
            $valid++;
        }

        return ['valid_count' => $valid, 'errors' => $errors];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{valid_count:int, errors:array<int, array<string, mixed>>}
     */
    private function validatePriceStockRows(User $user, array $rows): array
    {
        $errors = [];
        $valid = 0;
        $seen = [];

        $ownedSkus = $this->ownedSkuMap($user);

        foreach ($rows as $index => $row) {
            $line = $index + 2;
            $rowErrors = [];

            $sku = strtolower(trim((string) ($row['seller_sku'] ?? '')));

            if ($sku === '') {
                $rowErrors[] = 'A seller_sku kötelező.';
            } elseif (isset($seen[$sku])) {
                $rowErrors[] = 'A seller_sku a fájlon belül ismétlődik.';
            } elseif (!isset($ownedSkus[$sku])) {
                // An unknown SKU is an error; no new product may appear here.
                $rowErrors[] = 'Ismeretlen seller_sku: nem tartozik termék a fiókodhoz.';
            }

            $hasPrice = trim((string) ($row['price_huf'] ?? '')) !== '';
            $hasStock = trim((string) ($row['stock'] ?? '')) !== '';

            if (!$hasPrice && !$hasStock) {
                $rowErrors[] = 'Adj meg árat vagy készletet.';
            }

            if ($hasPrice && !$this->isWholeHuf($row['price_huf'])) {
                $rowErrors[] = 'Az ár egész forint kell legyen.';
            }

            if ($hasStock && !$this->isNonNegativeInt($row['stock'])) {
                $rowErrors[] = 'A készlet nem negatív egész szám kell legyen.';
            }

            if ($rowErrors !== []) {
                $errors[] = ['line' => $line, 'sku' => $sku, 'messages' => $rowErrors];

                continue;
            }

            $seen[$sku] = true;
            $valid++;
        }

        return ['valid_count' => $valid, 'errors' => $errors];
    }

    /**
     * Map price/stock rows onto product ids for the bulk service.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{rows:array<int, array{id:int, price?:int, stock?:int}>}
     */
    private function mapPriceStockRows(User $user, array $rows): array
    {
        $ownedSkus = $this->ownedSkuMap($user);
        $mapped = [];

        foreach ($rows as $row) {
            $sku = strtolower(trim((string) ($row['seller_sku'] ?? '')));
            $productId = $ownedSkus[$sku] ?? null;

            if (!$productId) {
                throw ValidationException::withMessages([
                    'import' => "Ismeretlen seller_sku: {$sku}.",
                ]);
            }

            $entry = ['id' => $productId];

            if (trim((string) ($row['price_huf'] ?? '')) !== '') {
                $entry['price'] = (int) $row['price_huf'];
            }

            if (trim((string) ($row['stock'] ?? '')) !== '') {
                $entry['stock'] = (int) $row['stock'];
            }

            $mapped[] = $entry;
        }

        return ['rows' => $mapped];
    }

    /** @return array<string, int> lowercase seller_sku => product id */
    private function ownedSkuMap(User $user): array
    {
        return Product::query()
            ->join('stores', 'products.store_id', '=', 'stores.id')
            ->where('stores.user_id', $user->id)
            ->whereNotNull('products.seller_sku')
            ->pluck('products.id', 'products.seller_sku')
            ->mapWithKeys(fn ($id, $sku) => [strtolower((string) $sku) => (int) $id])
            ->all();
    }

    private function fingerprint(array $rows): string
    {
        return hash('sha256', json_encode($rows, JSON_UNESCAPED_UNICODE));
    }

    private function isWholeHuf(mixed $value): bool
    {
        $text = trim((string) $value);

        // No thousands separator, no currency symbol: digits only.
        return $text !== '' && preg_match('/^\d+$/', $text) === 1;
    }

    private function isNonNegativeInt(mixed $value): bool
    {
        $text = trim((string) $value);

        return $text !== '' && preg_match('/^\d+$/', $text) === 1;
    }

    private function uniqueSlug(int $storeId, string $name): string
    {
        $base = Str::slug($name) ?: 'termek';
        $slug = $base;
        $counter = 2;

        while (Product::where('store_id', $storeId)->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function assertMode(string $mode): void
    {
        if (!in_array($mode, [ProductImport::MODE_CREATE, ProductImport::MODE_PRICE_STOCK], true)) {
            throw ValidationException::withMessages(['mode' => 'Érvénytelen import mód.']);
        }
    }

    private function assertPro(User $user): void
    {
        if (!app(PlanService::class)->isPro($user)) {
            throw ValidationException::withMessages([
                'plan' => 'Az import PRO csomaghoz tartozik.',
            ]);
        }
    }
}

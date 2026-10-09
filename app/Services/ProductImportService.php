<?php

namespace App\Services;

use App\Models\Category;
use App\Models\County;
use App\Models\Product;
use App\Models\ProductImport;
use App\Models\ProductImportBatch;
use App\Models\Settlement;
use App\Models\StoreMedia;
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
     * Create products from the parsed rows, all or nothing.
     *
     * Products are created ACTIVE so a bulk upload goes live immediately, and
     * linked to a batch so an admin can take the whole upload offline again.
     *
     * @return array{created:int, batch_id:int}
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

        $batchId = DB::transaction(function () use ($store, $rows, $import, $user) {
            /*
             * The batch groups everything from this upload, so the whole set
             * can be hidden in one action later.
             */
            $batch = ProductImportBatch::create([
                'store_id' => $store->id,
                'user_id' => $user->id,
                'label' => 'Tömeges feltöltés #' . $import->id,
                'product_count' => count($rows),
                'status' => ProductImportBatch::ACTIVE,
            ]);

            $mediaByName = $this->mediaIndex($store->id);
            $media = StoreMedia::whereIn('id', array_values($mediaByName))->get()->keyBy('id');

            foreach ($rows as $row) {
                $product = $store->products()->create([
                    'name' => trim((string) $row['termek_nev']),
                    'slug' => $this->uniqueSlug($store->id, (string) $row['termek_nev']),
                    'description' => trim((string) ($row['termek_leiras'] ?? '')),
                    'category_id' => (int) $row['kategoria_id'],
                    'price' => (int) $row['ar_huf'],
                    'stock' => (int) $row['keszlet'],
                    'condition' => $this->condition($row['allapot'] ?? null),
                    'listing_type' => $this->listingType($row['hirdetes_tipusa'] ?? null),
                    'county_id' => (int) $row['megye_id'],
                    'settlement_id' => (int) $row['telepules_id'],
                    'brand' => $this->nullableLower($row['marka'] ?? null),
                    'model' => $this->nullableLower($row['modell'] ?? null),
                    'shipping_available' => $this->yesNo($row['csomagkuldes'] ?? null),
                    'shipping_methods' => $this->shippingMethods($row),
                    'personal_pickup' => $this->yesNo($row['szemelyes_atvetel'] ?? null),
                    'contains_ai' => $this->yesNo($row['mi_tartalom'] ?? null),
                    'has_warranty' => $this->yesNo($row['garancia'] ?? null),
                    'warranty_expires_at' => $this->warrantyDate($row),
                    // Live on upload, as the seller asked.
                    'is_active' => true,
                    'import_batch_id' => $batch->id,
                ]);

                $product->forceFill([
                    'seller_sku' => trim((string) $row['egyedi_termekazonosito']),
                ])->save();

                $this->attachImportImages($product, $row, $mediaByName, $media);
            }

            $import->forceFill([
                'status' => ProductImport::COMMITTED,
                'committed_at' => now(),
            ])->save();

            return $batch->id;
        });

        return ['created' => count($rows), 'batch_id' => $batchId];
    }

    /**
     * Attach the cover and gallery images named in the row.
     *
     * Only files that exist in the seller's own library are attached, so a
     * spreadsheet can never reference an arbitrary path. The cover counts
     * toward the photo limit exactly like a manual upload.
     *
     * @param  array<string, mixed>  $row
     * @param  array<string, int>  $mediaByName
     * @param  \Illuminate\Support\Collection<int, StoreMedia>  $media
     */
    private function attachImportImages(
        Product $product,
        array $row,
        array $mediaByName,
        $media
    ): void {
        $order = 0;
        $coverName = $this->normalizeMediaName($row['kiemelt_kep'] ?? null);
        $pending = [];

        if ($coverName && isset($mediaByName[$coverName])) {
            $pending[] = $mediaByName[$coverName];
        }

        foreach ($this->galleryNames($row['galeria_kepek'] ?? null) as $galleryName) {
            if (isset($mediaByName[$galleryName])) {
                $pending[] = $mediaByName[$galleryName];
            }
        }

        // The plan caps how many photos one listing may hold.
        $limit = app(PlanService::class)->maxPhotosPerListing(
            $product->store->user
        );

        foreach (array_slice($pending, 0, $limit) as $index => $mediaId) {
            $item = $media[$mediaId] ?? null;

            if (!$item) {
                continue;
            }

            $product->images()->create([
                'path' => $item->path,
                'sort_order' => $order++,
                'is_primary' => $index === 0,
            ]);
        }
    }

    /** @return array<string, int> lowercase media name => id */
    private function mediaIndex(?int $storeId): array
    {
        if (!$storeId) {
            return [];
        }

        return StoreMedia::query()
            ->where('store_id', $storeId)
            ->pluck('id', 'name')
            ->mapWithKeys(fn ($id, $name) => [strtolower((string) $name) => (int) $id])
            ->all();
    }

    /** @return array<int, string> */
    private function galleryNames(mixed $value): array
    {
        $raw = trim((string) $value);

        if ($raw === '') {
            return [];
        }

        return collect(explode(',', $raw))
            ->map(fn ($name) => $this->normalizeMediaName($name))
            ->filter()
            ->values()
            ->all();
    }

    private function normalizeMediaName(mixed $value): ?string
    {
        $name = strtolower(trim((string) $value));

        return $name === '' ? null : $name;
    }

    private function imageExists(mixed $value, array $mediaByName): bool
    {
        $name = $this->normalizeMediaName($value);

        return $name !== null && isset($mediaByName[$name]);
    }

    /* ---------------------------------------------------------------- value helpers */

    /** Maps the Hungarian "allapot" wording onto the stored value. */
    private function condition(mixed $value): ?string
    {
        return match (mb_strtolower(trim((string) $value))) {
            'uj', 'új' => 'new',
            'hasznalt', 'használt' => 'used',
            default => null,
        };
    }

    private function listingType(mixed $value): ?string
    {
        return match (mb_strtolower(trim((string) $value))) {
            'keres' => 'wanted',
            'kinal', 'kínál' => 'offer',
            default => null,
        };
    }

    private function yesNo(mixed $value): bool
    {
        return in_array(
            mb_strtolower(trim((string) $value)),
            ['igen', 'yes', 'true', '1'],
            true
        );
    }

    private function isYesNo(mixed $value): bool
    {
        return in_array(
            mb_strtolower(trim((string) $value)),
            ['igen', 'nem', 'yes', 'no', 'true', 'false', '1', '0'],
            true
        );
    }

    /**
     * The selected shipping methods.
     *
     * Returns an empty list when shipping is off, so a stray "igen" in a
     * method column cannot leave shipping half-configured.
     *
     * @param  array<string, mixed>  $row
     * @return array<int, string>
     */
    private function shippingMethods(array $row): array
    {
        if (!$this->yesNo($row['csomagkuldes'] ?? null)) {
            return [];
        }

        $methods = [];

        if ($this->yesNo($row['foxpost'] ?? null)) {
            $methods[] = 'foxpost';
        }

        if ($this->yesNo($row['gls'] ?? null)) {
            $methods[] = 'gls';
        }

        if ($this->yesNo($row['magyar_posta'] ?? null)) {
            $methods[] = 'magyar_posta';
        }

        return $methods;
    }

    /** Accepts N/A, blank, or EEEE.HH.NN. - the format the template documents. */
    private function warrantyDate(array $row): ?string
    {
        if (!$this->yesNo($row['garancia'] ?? null)) {
            return null;
        }

        $raw = trim((string) ($row['garancia_lejarat'] ?? ''));

        if ($raw === '' || in_array(mb_strtolower($raw), ['n/a', 'na'], true)) {
            return null;
        }

        // 2027.10.09. -> 2027-10-09
        if (preg_match('/^(\d{4})\.(\d{2})\.(\d{2})\.?$/', $raw, $m)) {
            return "{$m[1]}-{$m[2]}-{$m[3]}";
        }

        return null;
    }

    private function isValidWarrantyDate(mixed $date, mixed $warranty): bool
    {
        // A date is only required when warranty is offered.
        if (!$this->yesNo($warranty)) {
            return true;
        }

        $raw = trim((string) $date);

        if ($raw === '' || in_array(mb_strtolower($raw), ['n/a', 'na'], true)) {
            // Warranty is on but no date given: the product form requires one.
            return false;
        }

        return $this->warrantyDate(['garancia' => 'igen', 'garancia_lejarat' => $raw]) !== null;
    }

    /** Lowercase letters, spaces and hyphens only, as the spec asks. */
    private function isValidBrandOrModel(mixed $value): bool
    {
        $raw = trim((string) $value);

        if ($raw === '') {
            return true; // optional
        }

        return preg_match('/^[a-záéíóöőúüű]+( [a-záéíóöőúüű-]+)*$/u', $raw) === 1;
    }

    private function nullableLower(mixed $value): ?string
    {
        $raw = trim((string) $value);

        return $raw === '' ? null : mb_strtolower($raw);
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

        $existingMap = $this->ownedSkuMap($user);
        $categoryIds = Category::pluck('id')->flip();
        $countyIds = County::pluck('id')->flip();
        $settlementIds = Settlement::pluck('id')->flip();
        $settlementCounties = Settlement::pluck('county_id', 'id');

        // Media names available to this store, for image validation.
        $mediaByName = $this->mediaIndex($user->store?->id);

        foreach ($rows as $index => $row) {
            $line = $index + 2; // header is line 1
            $rowErrors = [];

            $sku = strtolower(trim((string) ($row['egyedi_termekazonosito'] ?? '')));

            if ($sku === '') {
                $rowErrors[] = 'Az egyedi_termekazonosito kötelező.';
            } elseif (isset($seenSkus[$sku])) {
                $rowErrors[] = 'Az egyedi_termekazonosito a fájlon belül ismétlődik.';
            } elseif (isset($existingMap[$sku])) {
                $rowErrors[] = 'Ez az egyedi_termekazonosito már létezik a termékeid között.';
            }

            $name = trim((string) ($row['termek_nev'] ?? ''));

            if ($name === '') {
                $rowErrors[] = 'A termek_nev kötelező.';
            } elseif (mb_strlen($name) > 200) {
                $rowErrors[] = 'A termek_nev legfeljebb 200 karakter lehet.';
            }

            if (mb_strlen((string) ($row['termek_leiras'] ?? '')) > 10000) {
                $rowErrors[] = 'A termek_leiras legfeljebb 10000 karakter lehet.';
            }

            if (!isset($categoryIds[(int) ($row['kategoria_id'] ?? 0)])) {
                $rowErrors[] = 'A kategoria_id nem létezik.';
            }

            if (!$this->isWholeNumber($row['ar_huf'] ?? null)) {
                $rowErrors[] = 'Az ar_huf egész forint kell legyen, ezreselválasztó nélkül.';
            }

            if (!$this->isWholeNumber($row['keszlet'] ?? null)) {
                $rowErrors[] = 'A keszlet nem negatív egész szám kell legyen.';
            }

            if ($this->condition($row['allapot'] ?? null) === null) {
                $rowErrors[] = 'Az allapot értéke "új" vagy "használt" kell legyen.';
            }

            if ($this->listingType($row['hirdetes_tipusa'] ?? null) === null) {
                $rowErrors[] = 'A hirdetes_tipusa értéke "keres" vagy "kínál" kell legyen.';
            }

            if (!isset($countyIds[(int) ($row['megye_id'] ?? 0)])) {
                $rowErrors[] = 'A megye_id nem létezik.';
            }

            $settlementId = (int) ($row['telepules_id'] ?? 0);

            if (!isset($settlementIds[$settlementId])) {
                $rowErrors[] = 'A telepules_id nem létezik.';
            } elseif ((int) ($row['megye_id'] ?? 0) !== 0
                && (int) ($settlementCounties[$settlementId] ?? 0) !== (int) $row['megye_id']) {
                // The settlement must belong to the stated county, or the pin is wrong.
                $rowErrors[] = 'A telepules_id nem tartozik a megadott megye_id-hoz.';
            }

            if (!$this->isValidBrandOrModel($row['marka'] ?? null)) {
                $rowErrors[] = 'A marka csak kisbetűket és betűket tartalmazhat, több szó engedett.';
            }

            if (!$this->isValidBrandOrModel($row['modell'] ?? null)) {
                $rowErrors[] = 'A modell csak kisbetűket és betűket tartalmazhat, több szó engedett.';
            }

            foreach (['csomagkuldes', 'szemelyes_atvetel', 'mi_tartalom', 'garancia'] as $flag) {
                if (!$this->isYesNo($row[$flag] ?? null)) {
                    $rowErrors[] = "A(z) {$flag} értéke \"igen\" vagy \"nem\" kell legyen.";
                }
            }

            // Shipping method flags only matter when shipping is offered.
            if ($this->yesNo($row['csomagkuldes'] ?? null)) {
                foreach (['foxpost', 'gls', 'magyar_posta'] as $method) {
                    if (array_key_exists($method, $row) && !$this->isYesNo($row[$method])) {
                        $rowErrors[] = "A(z) {$method} értéke \"igen\" vagy \"nem\" kell legyen.";
                    }
                }

                if ($this->shippingMethods($row) === []) {
                    $rowErrors[] = 'Csomagküldéshez jelölj meg legalább egy módot (foxpost, gls, magyar_posta).';
                }
            }

            if (!$this->isValidWarrantyDate($row['garancia_lejarat'] ?? null, $row['garancia'] ?? null)) {
                $rowErrors[] = 'A garancia_lejarat formátuma EEEE.HH.NN. (pl. 2027.10.09.) vagy N/A.';
            }

            // Images must exist in the library; a name is not a path.
            if (!$this->imageExists($row['kiemelt_kep'] ?? null, $mediaByName)) {
                $rowErrors[] = sprintf(
                    'A kiemelt_kep ("%s") nem található a media tárban.',
                    (string) ($row['kiemelt_kep'] ?? '')
                );
            }

            foreach ($this->galleryNames($row['galeria_kepek'] ?? null) as $galleryName) {
                if (!isset($mediaByName[$galleryName])) {
                    $rowErrors[] = sprintf('A galéria kép ("%s") nem található a media tárban.', $galleryName);
                }
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

            $sku = strtolower(trim((string) ($row['egyedi_termekazonosito'] ?? '')));

            if ($sku === '') {
                $rowErrors[] = 'Az egyedi_termekazonosito kötelező.';
            } elseif (isset($seen[$sku])) {
                $rowErrors[] = 'Az egyedi_termekazonosito a fájlon belül ismétlődik.';
            } elseif (!isset($ownedSkus[$sku])) {
                // An unknown sku is an error; no new product may appear here.
                $rowErrors[] = 'Ismeretlen egyedi_termekazonosito: nem tartozik termék a fiókodhoz.';
            }

            $hasPrice = trim((string) ($row['ar_huf'] ?? '')) !== '';
            $hasStock = trim((string) ($row['keszlet'] ?? '')) !== '';

            if (!$hasPrice && !$hasStock) {
                $rowErrors[] = 'Adj meg árat vagy készletet.';
            }

            if ($hasPrice && !$this->isWholeNumber($row['ar_huf'])) {
                $rowErrors[] = 'Az ar_huf egész forint kell legyen.';
            }

            if ($hasStock && !$this->isWholeNumber($row['keszlet'])) {
                $rowErrors[] = 'A keszlet nem negatív egész szám kell legyen.';
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
            $sku = strtolower(trim((string) ($row['egyedi_termekazonosito'] ?? '')));
            $productId = $ownedSkus[$sku] ?? null;

            if (!$productId) {
                throw ValidationException::withMessages([
                    'import' => "Ismeretlen egyedi_termekazonosito: {$sku}.",
                ]);
            }

            $entry = ['id' => $productId];

            if (trim((string) ($row['ar_huf'] ?? '')) !== '') {
                $entry['price'] = (int) $row['ar_huf'];
            }

            if (trim((string) ($row['keszlet'] ?? '')) !== '') {
                $entry['stock'] = (int) $row['keszlet'];
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

    /** Digits only: no thousands separator and no currency symbol. */
    private function isWholeNumber(mixed $value): bool
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

<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProductImageResource;
use App\Models\Product;
use App\Services\ProductListingLifecycle;
use App\Models\Store;
use App\Models\County;
use App\Models\Settlement;
use App\Support\ProductLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
class ProductController extends Controller
{
    public function index(Store $store)
    {
        abort_unless($store->is_active, 404);
        return ProductResource::collection($store->products()
            ->visibleForSale()->with(['store', 'images', 'categories'])->latest()->paginate(20));
    }
    public function show(Product $product): ProductResource
    {
        abort_unless($product->isVisibleForSale(), 404);
        return new ProductResource($product->load(['store', 'images', 'categories']));
    }
    public function sellerShow(Product $product): ProductResource
    {
        Gate::authorize('update', $product);
        return new ProductResource($product->load(['store', 'images', 'categories']));
    }
    public function sellerImages(Product $product)
    {
        Gate::authorize('update', $product);
        return ProductImageResource::collection($product->images()->get());
    }
    public function store(ProductRequest $request, Store $store): JsonResponse
    {
        Gate::authorize('create', [Product::class, $store]);
        $data = $this->normalizeData($request->validated());
        $categoryIds = $this->extractCategoryIds($data);
        $data['slug'] = $this->uniqueSlug($store, $data['name']);
        $data['is_active'] = $request->boolean('is_active', true);
        $data['listing_type'] ??= 'offer';
        $data['contains_ai'] ??= false;
        $product = DB::transaction(function () use ($store, $data, $categoryIds) {
            $product = $store->products()->create($data);
            $product->categories()->sync($categoryIds);
            return $product;
        });
        return response()->json([
            'message' => 'Product created successfully.',
            'product' => new ProductResource($product->load(['store', 'images', 'categories'])),
        ], 201);
    }
    public function update(ProductRequest $request, Product $product): ProductResource
    {
        Gate::authorize('update', $product);
        $data = $this->normalizeData($request->validated(), $product);
        $categoryIds = $this->extractCategoryIds($data);
        if (isset($data['name']) && $data['name'] !== $product->name) {
            $data['slug'] = $this->uniqueSlug($product->store, $data['name'], $product->id);
        }
        DB::transaction(function () use ($product, $data, $categoryIds) {
            $product->update($data);
            if ($categoryIds !== null) $product->categories()->sync($categoryIds);
        });
        return new ProductResource($product->fresh()->load(['store', 'images', 'categories']));
    }
    public function destroy(Product $product): JsonResponse
    {
        Gate::authorize('delete', $product);
        $removed = app(ProductListingLifecycle::class)->remove($product);
        return response()->json([
            'message' => 'Product deleted successfully.',
            'product_id' => $removed->id,
            'removed_at' => $removed->deleted_at?->toISOString(),
        ]);
    }
    public function updateListingStatus(Request $request, Product $product): ProductResource
    {
        Gate::authorize('update', $product);
        $data = $request->validate([
            'listing_status' => ['required', 'in:available,in_progress,sold'],
        ]);
        $updated = app(ProductListingLifecycle::class)->changeStatus($product, $data['listing_status']);
        return new ProductResource($updated->load(['store', 'images', 'categories']));
    }

    public function mine(Request $request)
    {
        $store = $request->user()->store;
        if (!$store) {
            return response()->json(['data' => [], 'meta' => [
                'current_page' => 1, 'last_page' => 1, 'per_page' => 20, 'total' => 0,
            ]]);
        }
        return ProductResource::collection($store->products()
            ->with(['store', 'images', 'categories'])->latest()->paginate(20));
    }
    public function marketplace(Request $request): JsonResponse
    {
        // Hero uses camelCase filter names; seller APIs use snake_case product fields.
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'category_ids' => ['sometimes', 'array', 'min:1', 'max:1000'],
            'category_ids.*' => ['required', 'integer', 'distinct', 'exists:categories,id'],
            'minPrice' => ['nullable', 'numeric', 'min:0'],
            'maxPrice' => ['nullable', 'numeric', 'min:0'],
            'county_id' => ['nullable', 'integer', 'exists:counties,id'],
            'settlement_id' => ['nullable', 'integer', 'exists:settlements,id'],
            'county' => ['nullable', 'string', 'max:100'],
            'settlement' => ['nullable', 'string', 'max:100'],
            'store' => ['nullable', 'string', 'max:100'],
            'excludedWords' => ['nullable', 'string', 'max:500'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'new' => ['sometimes', 'boolean'], 'used' => ['sometimes', 'boolean'],
            'shipping' => ['sometimes', 'boolean'], 'excludeAi' => ['sometimes', 'boolean'],
            'warranty' => ['sometimes', 'boolean'], 'personalPickup' => ['sometimes', 'boolean'],
            'trustedSeller' => ['sometimes', 'boolean'],
            'keres' => ['sometimes', 'boolean'], 'kinal' => ['sometimes', 'boolean'],
        ]);
        if (isset($validated['minPrice'], $validated['maxPrice']) && $validated['maxPrice'] < $validated['minPrice']) {
            throw ValidationException::withMessages(['maxPrice' => ['A maximális ár nem lehet kisebb a minimális árnál.']]);
        }
        $query = Product::query()->visibleForSale()
            ->with(['store', 'images', 'categories']);
        $search = trim($validated['search'] ?? '');
        if ($search !== '') {
            $pattern = $this->likePattern($search);
            $query->where(fn ($q) => $q->whereRaw("name LIKE ? ESCAPE '!'", [$pattern])
                ->orWhereRaw("description LIKE ? ESCAPE '!'", [$pattern]));
        }
        if (isset($validated['category_ids'])) $this->filterCategories($query, $validated['category_ids']);
        if (isset($validated['category_id'])) $this->filterCategories($query, [$validated['category_id']]);
        if (isset($validated['minPrice'])) $query->where('price', '>=', $validated['minPrice']);
        if (isset($validated['maxPrice'])) $query->where('price', '<=', $validated['maxPrice']);
        if (isset($validated['county_id'])) {
            $county = County::findOrFail($validated['county_id']);
            $query->where(fn ($q) => $q->where('county_id', $county->id)
                ->orWhere(fn ($legacy) => $legacy->whereNull('county_id')->where('county', $county->name)));
        }
        if (isset($validated['settlement_id'])) {
            $settlement = Settlement::with('county')->findOrFail($validated['settlement_id']);
            $query->where(fn ($q) => $q->where('settlement_id', $settlement->id)
                ->orWhere(fn ($legacy) => $legacy->whereNull('settlement_id')->where('settlement', $settlement->name)
                    ->where('county', $settlement->county->name)));
        }
        foreach (['county', 'settlement', 'brand', 'model'] as $field) {
            if (in_array($field, ['county', 'settlement'], true) && isset($validated[$field . '_id'])) continue;
            $value = trim($validated[$field] ?? '');
            if ($value !== '') $query->whereRaw("{$field} LIKE ? ESCAPE '!'", [$this->likePattern($value)]);
        }
        $store = trim($validated['store'] ?? '');
        if ($store !== '') {
            $query->whereHas('store', fn ($q) => $q->whereRaw("name LIKE ? ESCAPE '!'", [$this->likePattern($store)]));
        }
        // OR within each group, AND between different filters.
        $conditions = [];
        if ($request->boolean('new')) $conditions[] = 'new';
        if ($request->boolean('used')) $conditions[] = 'used';
        if ($conditions) $query->whereIn('condition', $conditions);
        $types = [];
        if ($request->boolean('keres')) $types[] = 'wanted';
        if ($request->boolean('kinal')) $types[] = 'offer';
        if ($types) $query->whereIn('listing_type', $types);
        if ($request->boolean('shipping')) $query->where('shipping_available', true);
        if ($request->boolean('personalPickup')) $query->where('personal_pickup', true);
        // Legacy null values are unclassified and excluded by the AI-free filter.
        if ($request->boolean('excludeAi')) $query->where('contains_ai', false);
        if ($request->boolean('warranty')) {
            $query->where('has_warranty', true)
                ->whereDate('warranty_expires_at', '>=', today()->toDateString());
        }
        if ($request->boolean('trustedSeller')) {
            $query->whereHas('store', fn ($q) => $q->where('is_trusted_seller', true));
        }
        // Comma-separated terms; one phrase such as "hibás kijelző" stays intact.
        $excluded = array_filter(array_map('trim', explode(',', $validated['excludedWords'] ?? '')));
        foreach ($excluded as $word) {
            $pattern = $this->likePattern($word);
            $query->whereRaw("name NOT LIKE ? ESCAPE '!'", [$pattern])
                ->where(fn ($q) => $q->whereNull('description')->orWhereRaw("description NOT LIKE ? ESCAPE '!'", [$pattern]));
        }
        $products = $query->latest()->orderByDesc('id')->paginate($validated['per_page'] ?? 24);
        $data = $products->getCollection()->map(function (Product $product) {
            $primary = $product->images->firstWhere('is_primary', true) ?? $product->images->first();
            return [
                'id' => $product->id, 'category_id' => $product->category_id,
                'category_ids' => array_values(array_unique(array_merge(
                    $product->category_id !== null ? [(int) $product->category_id] : [],
                    $product->categories->pluck('id')->map(fn ($id) => (int) $id)->all()
                ))),
                'name' => $product->name, 'slug' => $product->slug,
                'description' => $product->description, 'price' => $product->price,
                'stock' => $product->stock,
                'listing_status' => $product->effectiveListingStatus(),
                'posted_at' => $product->posted_at?->toISOString(),
                'created_at' => $product->created_at?->toISOString(),
                'expires_at' => $product->expires_at?->toISOString(),
                'condition' => $product->condition, 'listing_type' => $product->listing_type,
                'county_id' => $product->county_id, 'settlement_id' => $product->settlement_id,
                'county' => $product->county, 'settlement' => $product->settlement,
                'brand' => $product->brand, 'model' => $product->model,
                'shipping_available' => $product->shipping_available,
                'shipping_methods' => $product->shipping_methods ?? [],
                'contains_ai' => $product->contains_ai,
                'has_warranty' => $product->has_warranty,
                'warranty_expires_at' => $product->warranty_expires_at?->format('Y-m-d'),
                'personal_pickup' => $product->personal_pickup,
                'image' => $primary ? asset('storage/' . $primary->path) : null,
                'store' => $product->store ? [
                    'id' => $product->store->id,
                    'name' => $product->store->name,
                    'slug' => $product->store->slug,
                    'is_trusted_seller' => $product->store->is_trusted_seller,
                    'positive_ratings_count' => (int) $product->store->positive_ratings_count,
                    'negative_ratings_count' => (int) $product->store->negative_ratings_count,
                ] : null,
            ];
        })->all();
        return response()->json(['data' => $data, 'meta' => [
            'current_page' => $products->currentPage(), 'last_page' => $products->lastPage(),
            'per_page' => $products->perPage(), 'total' => $products->total(),
            'from' => $products->firstItem(), 'to' => $products->lastItem(),
        ]]);
    }
    private function extractCategoryIds(array &$data): ?array
    {
        if (array_key_exists('category_ids', $data)) {
            $ids = array_values(array_unique(array_map('intval', $data['category_ids'])));
            unset($data['category_ids']);
            $data['category_id'] = $ids[0];
            return $ids;
        }
        // Preserve existing single-category API clients.
        if (array_key_exists('category_id', $data)) return [(int) $data['category_id']];
        // An unrelated PATCH must not alter the category selection.
        return null;
    }
    private function filterCategories($query, array $ids): void
    {
        // EXISTS avoids duplicate products and inflated totals for multi-category matches.
        $query->where(function ($q) use ($ids) {
            $q->whereIn('category_id', $ids)
                ->orWhereHas('categories', fn ($categoryQuery) => $categoryQuery->whereIn('categories.id', $ids));
        });
    }
    private function normalizeData(array $data, ?Product $product = null): array
    {
        $data = array_replace($data, ProductLocation::resolve($data, $product));
        // Avoid retaining stale details when options are turned off, including PATCH.
        $shipping = $data['shipping_available'] ?? $product?->shipping_available ?? false;
        if (!$shipping) $data['shipping_methods'] = [];
        $warranty = $data['has_warranty'] ?? $product?->has_warranty ?? false;
        if (!$warranty) $data['warranty_expires_at'] = null;
        return $data;
    }
    private function uniqueSlug(Store $store, string $name, ?int $exceptId = null): string
    {
        $base = Str::slug($name) ?: 'termek';
        $slug = $base;
        $counter = 2;
        while ($store->products()->withTrashed()->where('slug', $slug)
            ->when($exceptId !== null, fn ($q) => $q->whereKeyNot($exceptId))->exists()) {
            $slug = $base . '-' . $counter++;
        }
        return $slug;
    }
    private function likePattern(string $value): string
    {
        return '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $value) . '%';
    }
}

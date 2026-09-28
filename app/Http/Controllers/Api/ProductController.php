<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Gate;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Store $store)
    {
        abort_unless($store->is_active, 404);

        $products = $store->products()
            ->where('is_active', true)
            ->latest()
            ->paginate(20);

        return ProductResource::collection($products);
    }

    public function show(Product $product): ProductResource
    {
        abort_unless(
            $product->is_active && $product->store->is_active,
            404
        );

        $product->load([
            'store',
            'images',
        ]);

        return new ProductResource($product);
    }

    public function store(
        ProductRequest $request,
        Store $store
    ): JsonResponse {
        Gate::authorize('create', [Product::class, $store]);

        $data = $request->validated();

        $base = Str::slug($data['name']);
        $slug = $base;
        $counter = 2;

        while (
            $store->products()
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        $product = $store->products()->create([
            ...$data,
            'slug' => $slug,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'message' => 'Product created successfully.',
            'product' => new ProductResource($product),
        ], 201);
    }

    public function update(
        ProductRequest $request,
        Product $product
    ): ProductResource {
        Gate::authorize('update', $product);

        $data = $request->validated();

        if (isset($data['name'])) {
            $base = Str::slug($data['name']);
            $slug = $base;
            $counter = 2;

            while (
                $product->store
                    ->products()
                    ->where('slug', $slug)
                    ->whereKeyNot($product->id)
                    ->exists()
            ) {
                $slug = "{$base}-{$counter}";
                $counter++;
            }

            $data['slug'] = $slug;
        }

        $product->update($data);

        return new ProductResource($product->fresh());
    }

    public function destroy(Product $product): JsonResponse
    {
        Gate::authorize('delete', $product);

        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully.',
        ]);
    }


    public function mine(Request $request)
    {
        $products = $request->user()
            ->store
            ?->products()
            ->with('images')
            ->latest()
            ->paginate(20);

        if (!$products) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 20,
                    'total' => 0,
                ],
            ]);
        }

        return ProductResource::collection($products);
    }

    public function marketplace(Request $request)
    {
        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:100',
            ],
            'page' => [
                'nullable',
                'integer',
                'min:1',
            ],
            'per_page' => [
                'nullable',
                'integer',
                'min:1',
                'max:48',
            ],
        ]);

        $search = trim(
            $validated['search'] ?? ''
        );

        $perPage =
            $validated['per_page'] ?? 24;

        $query = Product::query()
            ->where('is_active', true)
            ->whereHas('store', function ($storeQuery) {
                $storeQuery->where(
                    'is_active',
                    true
                );
            })
            ->with([
                'store:id,name,slug',
                'images' => function ($imageQuery) {
                    $imageQuery->orderBy(
                        'sort_order'
                    );
                },
            ]);

        if ($search !== '') {
            $query->where(function ($productQuery) use ($search) {
                $productQuery
                    ->where(
                        'name',
                        'like',
                        '%' . $search . '%'
                    )
                    ->orWhere(
                        'description',
                        'like',
                        '%' . $search . '%'
                    );
            });
        }

        $products = $query
            ->latest()
            ->paginate($perPage);

        $products->getCollection()->transform(
            function ($product) {
                $primaryImage =
                    $product->images
                        ->firstWhere(
                            'is_primary',
                            true
                        )
                    ?? $product->images->first();

                return [
                    'id' => $product->id,

                    'name' => $product->name,

                    'description' =>
                        $product->description,

                    'price' => $product->price,

                    'stock' => $product->stock,

                    'image' => $primaryImage
                        ? asset(
                            'storage/' .
                            $primaryImage->path
                        )
                        : null,

                    'store' => $product->store
                        ? [
                            'id' =>
                                $product->store->id,

                            'name' =>
                                $product->store->name,

                            'slug' =>
                                $product->store->slug,
                        ]
                        : null,
                ];
            }
        );

        return response()->json([
            'data' => $products->items(),

            'meta' => [
                'current_page' =>
                    $products->currentPage(),

                'last_page' =>
                    $products->lastPage(),

                'per_page' =>
                    $products->perPage(),

                'total' =>
                    $products->total(),

                'from' =>
                    $products->firstItem(),

                'to' =>
                    $products->lastItem(),
            ],
        ]);
    }
}
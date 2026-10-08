<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    /**
     * Return all active top-level categories.
     */
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->with([
                'childrenRecursive',
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    }

    /**
     * Show a category by its hierarchical URL path.
     *
     * Examples:
     * /hardver
     * /hardver/alaplap
     * /hardver/alaplap/intel
     * /hardver/alaplap/intel/lga-1700
     */
    public function show(string $path): JsonResponse
    {
        $segments = collect(
            explode('/', trim($path, '/'))
        )
            ->filter()
            ->values();

        if ($segments->isEmpty()) {
            abort(404);
        }

        $parent = null;
        $category = null;

        foreach ($segments as $slug) {
            $query = Category::query()
                ->where('slug', $slug)
                ->where('is_active', true);

            if ($parent) {
                $query->where(
                    'parent_id',
                    $parent->id
                );
            } else {
                $query->whereNull('parent_id');
            }

            $category = $query->first();

            if (!$category) {
                abort(404);
            }

            $parent = $category;
        }

        /*
        |--------------------------------------------------------------------------
        | Load category relationships
        |--------------------------------------------------------------------------
        */

        $category->load([
            'parent',
            'children' => function ($query) {
                $query
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('name');
            },
        ]);

        /*
        |--------------------------------------------------------------------------
        | Build breadcrumb
        |--------------------------------------------------------------------------
        */

        $breadcrumb = [];

        $current = $category;

        while ($current) {
            $breadcrumbItem = [
                'id' => $current->id,
                'name' => $current->name,
                'slug' => $current->slug,
                'parent_id' => $current->parent_id,

                'icon' => $current->icon
                    ? asset(
                        'storage/' .
                        $current->icon
                    )
                    : null,
            ];

            array_unshift(
                $breadcrumb,
                $breadcrumbItem
            );

            $current = $current->parent;
        }

        /*
        |--------------------------------------------------------------------------
        | Find all descendant category IDs
        |--------------------------------------------------------------------------
        */

        $categoryIds = $this->descendantIds(
            $category
        );

        /*
        |--------------------------------------------------------------------------
        | Load products from this category and
        | all descendant categories
        |--------------------------------------------------------------------------
        */

        $products = \App\Models\Product::query()
            ->where('is_active', true)
            ->whereIn(
                'category_id',
                $categoryIds
            )
            ->with([
                'store',
                'images',
            ])
            // Same default order as the marketplace: bumped_at, then posted_at.
            ->defaultListingOrder()
            ->paginate(24);

        /*
        |--------------------------------------------------------------------------
        | Add primary product image URL
        |--------------------------------------------------------------------------
        */

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
                    'slug' => $product->slug,
                    'price' => $product->price,
                    'stock' => $product->stock,

                    'image' =>
                        $primaryImage
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
            'data' => [
                'category' => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'parent_id' =>
                        $category->parent_id,

                    'icon' => $category->icon
                        ? asset(
                            'storage/' .
                            $category->icon
                        )
                        : null,
                ],

                'breadcrumb' => $breadcrumb,

                'children' =>
                    $category->children
                        ->map(
                            function (
                                Category $child
                            ) {
                                return [
                                    'id' =>
                                        $child->id,

                                    'name' =>
                                        $child->name,

                                    'slug' =>
                                        $child->slug,

                                    'parent_id' =>
                                        $child->parent_id,

                                    'icon' =>
                                        $child->icon
                                            ? asset(
                                                'storage/' .
                                                $child->icon
                                            )
                                            : null,
                                ];
                            }
                        )
                        ->values(),

                'products' => $products,
            ],
        ]);
    }

    /**
     * Return the current category ID and all active
     * descendant category IDs.
     */
    private function descendantIds(
        Category $category
    ): array {
        $ids = [
            $category->id,
        ];

        $children = Category::query()
            ->where(
                'parent_id',
                $category->id
            )
            ->where('is_active', true)
            ->get();

        foreach ($children as $child) {
            $ids = array_merge(
                $ids,
                $this->descendantIds(
                    $child
                )
            );
        }

        return $ids;
    }
}
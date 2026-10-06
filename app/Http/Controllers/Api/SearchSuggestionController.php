<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchSuggestionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $term = trim($validated['q'] ?? '');

        if ($term === '') {
            return response()->json(['categories' => [], 'products' => []]);
        }

        $contains = '%' . $term . '%';
        $startsWith = $term . '%';

        $categories = Category::query()
            ->select(['id', 'parent_id', 'name', 'slug'])
            ->where('name', 'like', $contains)
            ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', [$startsWith])
            ->orderBy('name')
            ->limit(6)
            ->get();

        // Fetch ancestors in batches so nested category links use the same
        // /parent/child path as the existing Category page.
        $nodes = $categories->keyBy('id');
        $pending = $categories->pluck('parent_id')->filter()->unique()->values();

        while ($pending->isNotEmpty()) {
            $level = Category::query()
                ->select(['id', 'parent_id', 'slug'])
                ->whereIn('id', $pending)
                ->get();

            foreach ($level as $node) {
                $nodes->put($node->id, $node);
            }

            $pending = $level->pluck('parent_id')
                ->filter(fn ($id) => ! $nodes->has($id))
                ->unique()
                ->values();
        }

        $categorySuggestions = $categories->map(function ($category) use ($nodes) {
            $segments = [];
            $seen = [];
            $node = $category;

            while ($node && ! isset($seen[$node->id])) {
                $seen[$node->id] = true;
                array_unshift($segments, $node->slug);
                $node = $node->parent_id ? $nodes->get($node->parent_id) : null;
            }

            return [
                'id' => $category->id,
                'name' => $category->name,
                'url' => '/' . implode('/', $segments),
            ];
        })->values();

        $products = Product::query()
            ->visibleForSale()
            ->select(['id', 'name', 'description', 'price'])
            ->where(function ($query) use ($contains) {
                $query->where('name', 'like', $contains)
                    ->orWhere('description', 'like', $contains);
            })
            ->with(['images' => fn ($imageQuery) => $imageQuery->orderBy('sort_order')])
            ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', [$startsWith])
            ->orderByDesc('id')
            ->limit(6)
            ->get();

        $productSuggestions = $products->map(function ($product) {
            $image = $product->primaryImage();

            return [
                'id' => $product->id,
                'name' => $product->name,
                'price' => $product->price,
                'image' => $image ? asset('storage/' . $image->path) : null,
                'url' => '/product/' . $product->id,
            ];
        })->values();

        return response()->json([
            'categories' => $categorySuggestions,
            'products' => $productSuggestions,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminCategoryController extends Controller
{
    /**
     * Return the complete category tree.
     */
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->with([
                'childrenRecursive',
            ])
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    }

    /**
     * Create a category.
     */
    public function store(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'parent_id' => [
                'nullable',
                'integer',
                'exists:categories,id',
            ],

            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('categories', 'slug')
                    ->where(function ($query) use ($request) {
                        return $query->where(
                            'parent_id',
                            $request->input('parent_id')
                        );
                    }),
            ],

            'description' => [
                'nullable',
                'string',
            ],

            'sort_order' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'is_active' => [
                'nullable',
                'boolean',
            ],
        ]);

        $slug = Str::slug(
            $validated['slug']
                ?? $validated['name']
        );

        /*
        |--------------------------------------------------------------------------
        | Make sure generated slug is also unique
        |--------------------------------------------------------------------------
        */

        $slug = $this->makeUniqueSlug(
            $slug,
            $validated['parent_id'] ?? null
        );

        $category = Category::create([
            'parent_id' =>
                $validated['parent_id'] ?? null,

            'name' =>
                $validated['name'],

            'slug' =>
                $slug,

            'description' =>
                $validated['description'] ?? null,

            'sort_order' =>
                $validated['sort_order'] ?? 0,

            'is_active' =>
                $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' =>
                'Kategória létrehozva.',

            'data' =>
                $category->fresh(),
        ], 201);
    }

    /**
     * Update a category.
     */
    public function update(
        Request $request,
        Category $category
    ): JsonResponse {
        $validated = $request->validate([
            'parent_id' => [
                'nullable',
                'integer',
                'exists:categories,id',
            ],

            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('categories', 'slug')
                    ->ignore($category->id)
                    ->where(function ($query) use ($request) {
                        return $query->where(
                            'parent_id',
                            $request->input('parent_id')
                        );
                    }),
            ],

            'description' => [
                'nullable',
                'string',
            ],

            'sort_order' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'is_active' => [
                'nullable',
                'boolean',
            ],
        ]);

        $newParentId =
            $validated['parent_id'] ?? null;

        /*
        |--------------------------------------------------------------------------
        | Prevent category from becoming its own parent
        |--------------------------------------------------------------------------
        */

        if (
            $newParentId !== null &&
            (int) $newParentId ===
                (int) $category->id
        ) {
            return response()->json([
                'message' =>
                    'A kategória nem lehet saját maga szülőkategóriája.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent hierarchical cycles
        |
        | Example:
        |
        | Hardver
        |   Alaplap
        |     Intel
        |
        | "Hardver" cannot be moved underneath
        | "Intel".
        |--------------------------------------------------------------------------
        */

        if ($newParentId !== null) {
            $descendantIds =
                $this->descendantIds(
                    $category
                );

            if (
                in_array(
                    (int) $newParentId,
                    $descendantIds,
                    true
                )
            ) {
                return response()->json([
                    'message' =>
                        'A kategória nem helyezhető a saját alkategóriája alá.',
                ], 422);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Preserve current parent when parent_id wasn't supplied
        |--------------------------------------------------------------------------
        */

        $parentWasProvided =
            array_key_exists(
                'parent_id',
                $validated
            );

        $parentId = $parentWasProvided
            ? $newParentId
            : $category->parent_id;

        /*
        |--------------------------------------------------------------------------
        | Slug
        |--------------------------------------------------------------------------
        */

        $slug = Str::slug(
            $validated['slug']
                ?? $category->slug
                ?? $validated['name']
        );

        /*
        |--------------------------------------------------------------------------
        | If the category is moved to another parent,
        | make sure the slug is unique there.
        |--------------------------------------------------------------------------
        */

        $slugExists = Category::query()
            ->where('slug', $slug)
            ->where('parent_id', $parentId)
            ->where('id', '!=', $category->id)
            ->exists();

        if ($slugExists) {
            $slug = $this->makeUniqueSlug(
                $slug,
                $parentId,
                $category->id
            );
        }

        $category->update([
            'parent_id' =>
                $parentId,

            'name' =>
                $validated['name'],

            'slug' =>
                $slug,

            'description' =>
                $validated['description']
                ?? $category->description,

            'sort_order' =>
                $validated['sort_order']
                ?? $category->sort_order,

            'is_active' =>
                $validated['is_active']
                ?? $category->is_active,
        ]);

        return response()->json([
            'message' =>
                'Kategória frissítve.',

            'data' =>
                $category->fresh(),
        ]);
    }

    /**
     * Delete a category.
     *
     * Categories with children or products
     * cannot be deleted.
     */
    public function destroy(
        Category $category
    ): JsonResponse {
        if ($category->children()->exists()) {
            return response()->json([
                'message' =>
                    'A kategória nem törölhető, mert alkategóriái vannak.',
            ], 422);
        }

        if ($category->products()->exists()) {
            return response()->json([
                'message' =>
                    'A kategória nem törölhető, mert termékek tartoznak hozzá.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Remove category icon from storage too.
        |--------------------------------------------------------------------------
        */

        if ($category->icon) {
            Storage::disk('public')->delete(
                $category->icon
            );
        }

        $category->delete();

        return response()->json([
            'message' =>
                'Kategória törölve.',
        ]);
    }

    /**
     * Upload or replace category icon.
     */
    public function uploadIcon(
        Request $request,
        Category $category
    ): JsonResponse {
        $validated = $request->validate([
            'icon' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp,svg',
                'max:2048',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Delete previous icon
        |--------------------------------------------------------------------------
        */

        if ($category->icon) {
            Storage::disk('public')->delete(
                $category->icon
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Store new icon
        |--------------------------------------------------------------------------
        */

        $path = $request
            ->file('icon')
            ->store(
                'categories/' .
                    $category->id,
                'public'
            );

        $category->update([
            'icon' => $path,
        ]);

        return response()->json([
            'message' =>
                'Kategória ikon feltöltve.',

            'data' => [
                'id' =>
                    $category->id,

                'icon' =>
                    asset(
                        'storage/' .
                        $path
                    ),
            ],
        ]);
    }

    /**
     * Delete category icon.
     */
    public function deleteIcon(
        Category $category
    ): JsonResponse {
        if ($category->icon) {
            Storage::disk('public')->delete(
                $category->icon
            );
        }

        $category->update([
            'icon' => null,
        ]);

        return response()->json([
            'message' =>
                'Kategória ikon törölve.',
        ]);
    }

    /**
     * Return the current category and every
     * descendant category ID.
     */
    private function descendantIds(
        Category $category
    ): array {
        $ids = [
            (int) $category->id,
        ];

        $children = Category::query()
            ->where(
                'parent_id',
                $category->id
            )
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

    /**
     * Generate a unique slug within a parent.
     */
    private function makeUniqueSlug(
        string $slug,
        ?int $parentId,
        ?int $ignoreId = null
    ): string {
        $baseSlug = $slug;
        $counter = 2;

        while (true) {
            $query = Category::query()
                ->where(
                    'slug',
                    $slug
                )
                ->where(
                    'parent_id',
                    $parentId
                );

            if ($ignoreId !== null) {
                $query->where(
                    'id',
                    '!=',
                    $ignoreId
                );
            }

            if (!$query->exists()) {
                return $slug;
            }

            $slug =
                $baseSlug .
                '-' .
                $counter;

            $counter++;
        }
    }
}
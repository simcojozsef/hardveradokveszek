<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\County;
use App\Models\Settlement;
use Illuminate\Http\JsonResponse;

/*
 * Reference lists for the import template.
 *
 * Ids alone are meaningless in a spreadsheet, so these endpoints back the
 * public list pages that let a seller look up the id for a category, county
 * or settlement without opening the database.
 *
 * All three are public: the data is already visible on the storefront.
 */
class ReferenceListController extends Controller
{
    /** Categories, flat, with their parent so nesting is visible. */
    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->orderBy('parent_id')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'parent_id'])
            ->map(fn (Category $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'parent_id' => $category->parent_id,
            ]);

        return response()->json(['data' => $categories]);
    }

    /** Counties (megyék), with their numeric id. */
    public function counties(): JsonResponse
    {
        $counties = County::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (County $county) => [
                'id' => $county->id,
                'name' => $county->name,
            ]);

        return response()->json(['data' => $counties]);
    }

    /** Settlements (települések), each with its county id. */
    public function settlements(): JsonResponse
    {
        $settlements = Settlement::query()
            ->with('county:id,name')
            ->orderBy('county_id')
            ->orderBy('name')
            ->get(['id', 'name', 'county_id'])
            ->map(fn (Settlement $settlement) => [
                'id' => $settlement->id,
                'name' => $settlement->name,
                'county_id' => $settlement->county_id,
                'county_name' => $settlement->county?->name,
            ]);

        return response()->json(['data' => $settlements]);
    }
}

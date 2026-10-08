<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/*
 * The listings a seller wants kept when PRO ends.
 *
 * Only ids the seller actually owns are stored, and the list is capped at 10
 * by construction. A selection is a preference: the downgrade still enforces
 * the cap and fills any gap deterministically.
 */
class SellerRetentionController extends Controller
{
    private const MAX = 10;

    /** The current selection, newest first, for the UI to prefill. */
    public function index(Request $request): JsonResponse
    {
        $ids = DB::table('plan_retention_selections')
            ->where('user_id', $request->user()->id)
            ->orderBy('position')
            ->pluck('product_id');

        return response()->json(['data' => ['product_ids' => $ids]]);
    }

    /** Replace the whole selection in one request. */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['present', 'array', 'max:' . self::MAX],
            'product_ids.*' => ['integer'],
        ]);

        $user = $request->user();
        $ids = array_values(array_unique($validated['product_ids']));

        if (count($ids) > self::MAX) {
            throw ValidationException::withMessages([
                'product_ids' => sprintf('Legfeljebb %d hirdetést jelölhetsz meg.', self::MAX),
            ]);
        }

        /*
         * Ownership check: an id that is not the seller's own listing is
         * rejected outright rather than silently dropped.
         */
        $owned = Product::query()
            ->whereIn('id', $ids)
            ->whereHas('store', fn ($q) => $q->where('user_id', $user->id))
            ->pluck('id')
            ->all();

        if (count($owned) !== count($ids)) {
            throw ValidationException::withMessages([
                'product_ids' => 'Csak a saját hirdetéseidet jelölheted meg.',
            ]);
        }

        DB::transaction(function () use ($user, $ids) {
            DB::table('plan_retention_selections')->where('user_id', $user->id)->delete();

            foreach ($ids as $position => $productId) {
                DB::table('plan_retention_selections')->insert([
                    'user_id' => $user->id,
                    'product_id' => $productId,
                    'position' => $position,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        return response()->json([
            'message' => 'Kijelölés elmentve.',
            'data' => ['product_ids' => $ids],
        ]);
    }
}

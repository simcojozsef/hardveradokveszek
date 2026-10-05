<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreRatingController extends Controller
{
    public function show(Store $store): JsonResponse
    {
        abort_unless($store->is_active, 404);
        return response()->json($this->summary($store));
    }

    public function mine(Request $request, Store $store): JsonResponse
    {
        abort_unless($request->user()?->isBuyer(), 403);
        abort_unless($store->is_active, 404);

        return response()->json($this->summary($store, $request->user()->id));
    }

    public function update(Request $request, Store $store): JsonResponse
    {
        abort_unless($request->user()?->isBuyer(), 403);
        $validated = $request->validate([
            'value' => ['required', 'integer', Rule::in([-1, 1])],
        ]);

        $result = DB::transaction(function () use ($store, $request, $validated) {
            // Serializes writes for this store, including concurrent first votes.
            $lockedStore = Store::query()->whereKey($store->id)->lockForUpdate()->firstOrFail();
            abort_unless($lockedStore->is_active, 404);
            $now = now();

            DB::table('store_ratings')->upsert([
                [
                    'store_id' => $lockedStore->id,
                    // Always derive voter identity from authenticated session.
                    'user_id' => $request->user()->id,
                    'value' => (int) $validated['value'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ], ['store_id', 'user_id'], ['value', 'updated_at']);

            return $this->summary($lockedStore, $request->user()->id);
        }, 3);

        return response()->json($result);
    }

    private function summary(Store $store, ?int $userId = null): array
    {
        // Refresh after write; both counts are read in one aggregate query.
        $counts = $store->ratings()->selectRaw(
            'COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) AS positive_count, '
            . 'COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) AS negative_count'
        )->first();
        $vote = $userId === null ? null : $store->ratings()->where('user_id', $userId)->value('value');

        return [
            'positive_ratings_count' => (int) $counts->positive_count,
            'negative_ratings_count' => (int) $counts->negative_count,
            'user_vote' => $vote === null ? null : (int) $vote,
        ];
    }
}

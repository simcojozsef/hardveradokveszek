<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BulkListingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/*
 * PRO bulk operations on the seller's own listings.
 *
 * The controller only validates shape; every business rule (PRO entitlement,
 * ownership, caps, one-transaction guarantee) lives in the service so all
 * entry points share it.
 */
class SellerBulkListingController extends Controller
{
    public function __construct(
        private readonly BulkListingService $bulk,
    ) {
    }

    /** Bulk renewal with the shared availability confirmation. */
    public function renew(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array', 'max:' . BulkListingService::MAX_ROWS],
            'product_ids.*' => ['integer'],
            'available_confirmed' => ['required', 'accepted'],
        ]);

        $result = $this->bulk->renew(
            $request->user(),
            $validated['product_ids'],
            (bool) $validated['available_confirmed'],
        );

        return response()->json([
            'message' => sprintf('%d hirdetés megújítva.', $result['renewed']),
            'renewed' => $result['renewed'],
            'product_ids' => $result['ids'],
        ]);
    }

    /** Bulk price and/or stock edit, per product. */
    public function updatePriceStock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rows' => ['required', 'array', 'max:' . BulkListingService::MAX_ROWS],
            'rows.*.id' => ['required', 'integer'],
            'rows.*.price' => ['nullable', 'integer', 'min:0'],
            'rows.*.stock' => ['nullable', 'integer', 'min:0'],
        ]);

        $result = $this->bulk->updatePriceStock($request->user(), $validated['rows']);

        return response()->json([
            'message' => sprintf('%d termék módosítva.', $result['updated']),
            'updated' => $result['updated'],
            'product_ids' => $result['ids'],
        ]);
    }
}

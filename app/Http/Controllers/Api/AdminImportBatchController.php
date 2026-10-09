<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImportBatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/*
 * Bulk upload batches.
 *
 * Every import creates a batch. An admin can take a whole batch offline in one
 * action, which hides all of its products from the storefront, or bring it
 * back. Hand-uploaded products belong to no batch and are unaffected.
 *
 * A batch is a visibility switch, not a delete: nothing is removed, so a batch
 * can be re-enabled at any time and the data is never lost.
 */
class AdminImportBatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $batches = ProductImportBatch::query()
            ->with('user:id,name,email', 'store:id,name,slug')
            ->withCount('products')
            ->orderByDesc('id')
            ->paginate(25);

        return response()->json([
            'data' => collect($batches->items())->map(fn (ProductImportBatch $batch) => [
                'id' => $batch->id,
                'label' => $batch->label,
                'status' => $batch->status,
                'product_count' => $batch->products_count,
                'seller' => $batch->user?->only(['id', 'name', 'email']),
                'store' => $batch->store?->only(['id', 'name', 'slug']),
                'disabled_at' => $batch->disabled_at?->toIso8601String(),
                'created_at' => $batch->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $batches->currentPage(),
                'last_page' => $batches->lastPage(),
                'total' => $batches->total(),
            ],
            'counts' => [
                'active' => ProductImportBatch::where('status', ProductImportBatch::ACTIVE)->count(),
                'disabled' => ProductImportBatch::where('status', ProductImportBatch::DISABLED)->count(),
            ],
        ]);
    }

    /**
     * Turn a batch on or off across the whole storefront.
     *
     * Products are toggled with `is_active`, which is the same flag the search
     * and storefront already filter on, so the change is immediate everywhere
     * and needs no cache invalidation.
     */
    public function update(Request $request, ProductImportBatch $batch): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,disabled'],
        ]);

        $active = $validated['status'] === ProductImportBatch::ACTIVE;

        DB::transaction(function () use ($batch, $active) {
            Product::query()
                ->where('import_batch_id', $batch->id)
                ->update(['is_active' => $active, 'updated_at' => now()]);

            $batch->forceFill([
                'status' => $active
                    ? ProductImportBatch::ACTIVE
                    : ProductImportBatch::DISABLED,
                'disabled_at' => $active ? null : now(),
            ])->save();
        });

        return response()->json([
            'message' => $active
                ? 'A tömeges feltöltés aktiválva. A termékek ismét megjelennek.'
                : 'A tömeges feltöltés inaktiválva. A termékek eltűnnek a weboldalról.',
            'status' => $batch->fresh()->status,
        ]);
    }
}

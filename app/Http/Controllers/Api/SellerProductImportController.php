<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductImport;
use App\Services\ProductImportService;
use App\Services\ProductImportTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/*
 * PRO XLSX/CSV import.
 *
 * The controller validates file shape and delegates every business rule
 * (PRO entitlement, row caps, ownership, one-transaction commit) to the
 * services so all entry points share the same rules.
 */
class SellerProductImportController extends Controller
{
    public function __construct(
        private readonly ProductImportService $imports,
        private readonly ProductImportTemplate $templates,
    ) {
    }

    /** Download the template in the requested format. */
    public function template(Request $request): StreamedResponse
    {
        $format = $request->query('format') === 'csv' ? 'csv' : 'xlsx';
        $mode = $request->query('mode') === 'price_stock' ? 'price_stock' : 'create';

        return $this->templates->download($format, $mode);
    }

    /** Upload a file and receive a preview. Nothing is written yet. */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv,txt', 'max:5120'],
            'mode' => ['nullable', 'in:create,price_stock'],
        ]);

        $result = $this->imports->preview(
            $request->user(),
            $validated['file'],
            $validated['mode'] ?? ProductImport::MODE_CREATE,
        );

        return response()->json(['data' => $result['preview']]);
    }

    /** Commit a previewed import. */
    public function commit(Request $request, ProductImport $import): JsonResponse
    {
        $validated = $request->validate([
            'fingerprint' => ['required', 'string', 'size:64'],
        ]);

        $result = $this->imports->commit(
            $request->user(),
            $import,
            $validated['fingerprint'],
        );

        $count = $result['created'] ?? $result['updated'] ?? 0;

        return response()->json([
            'message' => $import->mode === ProductImport::MODE_CREATE
                ? sprintf('%d termék piszkozatként létrehozva.', $count)
                : sprintf('%d termék frissítve.', $count),
            'result' => $result,
            'mode' => $import->mode,
        ]);
    }
}

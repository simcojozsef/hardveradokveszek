<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InvoiceTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/*
 * The seller's own invoices for the PRO subscription.
 *
 * Scoped to the signed-in user at the query level, so one seller can never
 * list or read another's billing documents. No public document URL is
 * exposed; the invoice is delivered by Számlázz.hu to the billing address.
 */
class SellerInvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $invoices = InvoiceTask::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json([
            'data' => collect($invoices->items())->map(fn (InvoiceTask $task) => [
                'id' => $task->id,
                'invoice_number' => $task->invoice_number,
                'gross_huf' => $task->gross_huf,
                'currency' => $task->currency,
                'period_start' => $task->period_start?->toDateString(),
                'period_end' => $task->period_end?->toDateString(),
                'status' => $task->status,
                // The seller never sees internal error text, just the outcome.
                'is_available' => $task->status === InvoiceTask::ISSUED,
                'issued_at' => $task->issued_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'total' => $invoices->total(),
            ],
        ]);
    }
}

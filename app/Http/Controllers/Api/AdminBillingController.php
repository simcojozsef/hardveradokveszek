<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InvoiceTask;
use App\Models\StripeWebhookEvent;
use App\Models\Subscription;
use App\Services\SubscriptionPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/*
 * Admin view of the billing pipeline.
 *
 * Surfaces exactly what the spec asks for: subscriptions, payment/webhook
 * failures, invoices, uncertain billing tasks and unconsumed purchased bumps.
 * Retrying means re-running the same idempotent task — never creating a
 * second document blindly.
 */
class AdminBillingController extends Controller
{
    public function __construct(
        private readonly SubscriptionPaymentService $payments,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $tasks = InvoiceTask::query()
            ->with('user:id,name,email')
            ->when($status, fn ($q) => $q->where('status', $status))
            // The interesting ones first: unresolved before resolved.
            ->orderByRaw("CASE WHEN status IN ('uncertain','failed','pending','processing') THEN 0 ELSE 1 END")
            ->orderByDesc('id')
            ->paginate(25);

        return response()->json([
            'data' => collect($tasks->items())->map(fn (InvoiceTask $task) => [
                'id' => $task->id,
                'user' => $task->user?->only(['id', 'name', 'email']),
                'stripe_invoice_id' => $task->stripe_invoice_id,
                'order_number' => $task->order_number,
                'invoice_number' => $task->invoice_number,
                'gross_huf' => $task->gross_huf,
                'status' => $task->status,
                'email_status' => $task->email_status,
                'attempts' => $task->attempts,
                'error' => $task->error,
                'correction_status' => $task->correction_status,
                'correction_invoice_number' => $task->correction_invoice_number,
                'review_status' => $task->review_status,
                'review_note' => $task->review_note,
                'period_start' => $task->period_start?->toDateString(),
                'period_end' => $task->period_end?->toDateString(),
                'issued_at' => $task->issued_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'total' => $tasks->total(),
            ],
            'counts' => [
                'uncertain' => InvoiceTask::where('status', InvoiceTask::UNCERTAIN)->count(),
                'failed' => InvoiceTask::where('status', InvoiceTask::FAILED)->count(),
                'pending' => InvoiceTask::where('status', InvoiceTask::PENDING)->count(),
                'webhook_failed' => StripeWebhookEvent::where('status', StripeWebhookEvent::FAILED)->count(),
                'live_subscriptions' => Subscription::whereIn('status', Subscription::OPEN_STATUSES)->count(),
            ],
        ]);
    }

    /**
     * Flag a payment for review (refund, chargeback, dispute).
     *
     * Deliberately does NOT revoke PRO and does NOT cancel the Stripe
     * subscription: both are separate admin decisions, and an automatic
     * revocation could be wrong. It also blocks a stale invoice.paid event
     * from silently re-granting entitlement — the flag makes the payment
     * visibly reviewed instead.
     */
    public function flagReview(Request $request, InvoiceTask $invoiceTask): JsonResponse
    {
        $validated = $request->validate([
            'review_status' => ['required', 'in:refunded,partially_refunded,disputed,chargeback,cleared'],
            'review_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $invoiceTask->forceFill([
            'review_status' => $validated['review_status'],
            'review_note' => $validated['review_note'] ?? null,
        ])->save();

        return response()->json([
            'message' => 'Fizetés felülvizsgálati állapota rögzítve.',
            'review_status' => $invoiceTask->review_status,
        ]);
    }

    /**
     * Record a corrective document (storno / helyesbítő számla).
     *
     * The actual document is issued in Számlázz.hu; this links it to the
     * original so the pair can be audited. A partial refund must not storno
     * the whole invoice, so the type is an explicit choice.
     */
    public function recordCorrection(Request $request, InvoiceTask $invoiceTask): JsonResponse
    {
        $validated = $request->validate([
            'correction_type' => ['required', 'in:storno,correction'],
            'correction_invoice_number' => ['required', 'string', 'max:64'],
            'correction_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($invoiceTask->status !== InvoiceTask::ISSUED) {
            return response()->json([
                'message' => 'Csak kiállított számlához rögzíthető helyesbítő bizonylat.',
            ], 422);
        }

        $invoiceTask->forceFill([
            'correction_status' => 'issued',
            'correction_type' => $validated['correction_type'],
            'correction_invoice_number' => $validated['correction_invoice_number'],
            'correction_reason' => $validated['correction_reason'] ?? null,
            'corrected_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Helyesbítő bizonylat rögzítve.',
            'correction_invoice_number' => $invoiceTask->correction_invoice_number,
        ]);
    }

    /**
     * Retry one invoice task.
     *
     * Re-runs the same idempotent path: an already-issued task is left as is,
     * and an uncertain one is resolved by querying the agent first, so no
     * duplicate document is produced.
     */
    public function retry(InvoiceTask $invoiceTask): JsonResponse
    {
        if ($invoiceTask->status === InvoiceTask::ISSUED) {
            return response()->json([
                'message' => 'Ez a számla már kiállításra került.',
                'status' => $invoiceTask->status,
            ]);
        }

        $updated = $this->payments->processInvoiceTask($invoiceTask);

        return response()->json([
            'message' => match ($updated->status) {
                InvoiceTask::ISSUED => 'Számla kiállítva.',
                InvoiceTask::UNCERTAIN => 'Bizonytalan válasz — admin felülvizsgálat szükséges.',
                default => 'A számla kiállítása nem sikerült.',
            },
            'status' => $updated->status,
            'invoice_number' => $updated->invoice_number,
            'error' => $updated->error,
        ]);
    }
}

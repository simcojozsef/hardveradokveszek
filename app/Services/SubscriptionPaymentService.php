<?php

namespace App\Services;

use App\Models\BillingProfile;
use App\Models\InvoiceTask;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;
use App\Models\User;
use App\Notifications\SubscriptionNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/*
 * The single idempotent entry point for "a PRO period was paid".
 *
 * Called from the webhook and from the reconciliation job, so both paths
 * produce exactly the same result. Everything that must happen once — the
 * entitlement extension, the 5 bumps, the invoice task and the invoice itself
 * — is keyed on the paid period identity.
 */
class SubscriptionPaymentService
{
    public function __construct(
        private readonly SzamlazzService $szamlazz,
    ) {
    }

    /**
     * Record a paid Stripe invoice against a PRO subscription.
     *
     * Safe to call repeatedly with the same invoice: the period row is unique
     * on (subscription, period start, period end), so a replay finds the
     * existing period and grants nothing a second time.
     *
     * @return array{period_created:bool, invoice_task_id:?int}
     */
    public function recordPaidPeriod(
        User $user,
        Subscription $subscription,
        string $stripeInvoiceId,
        \DateTimeInterface $periodStart,
        \DateTimeInterface $periodEnd,
        int $grossHuf,
        string $currency = 'HUF',
    ): array {
        return DB::transaction(function () use (
            $user,
            $subscription,
            $stripeInvoiceId,
            $periodStart,
            $periodEnd,
            $grossHuf,
            $currency,
        ) {
            /*
             * Whether this seller already had a paid period, which is what
             * separates a first activation from a renewal in the notice.
             */
            $hadPriorPeriod = SubscriptionPeriod::query()
                ->where('subscription_id', $subscription->id)
                ->exists();

            $period = SubscriptionPeriod::query()->firstOrCreate(
                [
                    'subscription_id' => $subscription->id,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                ],
                [
                    'bumps_granted' => 5,
                    'bumps_used' => 0,
                ]
            );

            $periodCreated = $period->wasRecentlyCreated;

            /*
             * Entitlement only moves forward. A late-arriving event for an
             * older period must not shorten a longer paid window, and a
             * replay must not extend it either.
             */
            $current = $user->pro_entitled_until;
            $candidate = \Illuminate\Support\Carbon::instance($periodEnd);

            if ($current === null || $candidate->greaterThan($current)) {
                $user->forceFill(['pro_entitled_until' => $candidate])->save();
            }

            $subscription->forceFill([
                'status' => 'active',
                'current_period_start' => $periodStart,
                'current_period_end' => $periodEnd,
            ])->save();

            /*
             * One invoice task per Stripe invoice. firstOrCreate keyed on the
             * Stripe invoice id is what makes the billing side idempotent.
             *
             * The notification is only sent when the period row was newly
             * created, so a replayed webhook cannot mail the seller twice.
             */
            $mailType = $period->wasRecentlyCreated
                ? ($hadPriorPeriod ? SubscriptionNotification::RENEWED : SubscriptionNotification::ACTIVATED)
                : null;

            $task = InvoiceTask::query()->firstOrCreate(
                ['stripe_invoice_id' => $stripeInvoiceId],
                [
                    'user_id' => $user->id,
                    'subscription_id' => $subscription->id,
                    'buyer_snapshot' => $this->billingSnapshot($user),
                    'gross_huf' => $grossHuf,
                    'currency' => $currency,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'status' => InvoiceTask::PENDING,
                    'email_status' => InvoiceTask::PENDING,
                    'order_number' => $stripeInvoiceId,
                ]
            );

            return [
                'period_created' => $periodCreated,
                'invoice_task_id' => $task->id,
                'notification_type' => $mailType ?? null,
            ];
        });
    }

    /**
     * Issue the invoice for a task, if it is still outstanding.
     *
     * Never creates a second document: an uncertain result is queried by our
     * order number first, and a task that already has a number is left alone.
     */
    public function processInvoiceTask(InvoiceTask $task): InvoiceTask
    {
        if ($task->status === InvoiceTask::ISSUED) {
            return $task;
        }

        $snapshot = $task->buyer_snapshot ?? [];

        /*
         * The agent rejects a document without a complete buyer address.
         * Retrying cannot fix missing data, so this is flagged for admin
         * review instead of burning attempts on a doomed request. Checkout
         * already requires these fields, so this only catches a data gap that
         * slipped through (e.g. a legacy row).
         */
        $missing = $this->missingBuyerData($snapshot);

        if ($missing !== []) {
            $task->forceFill([
                'status' => InvoiceTask::UNCERTAIN,
                'error' => 'Hiányzó vevőadat a számlázáshoz: ' . implode(', ', $missing) . '.',
            ])->save();

            Log::error('Invoice task needs buyer data before it can be issued.', [
                'task_id' => $task->id,
                'missing' => $missing,
            ]);

            return $task;
        }

        $task->forceFill([
            'status' => InvoiceTask::PROCESSING,
            'attempts' => $task->attempts + 1,
        ])->save();

        $result = $this->szamlazz->issueProSubscriptionInvoice(
            $task->order_number,
            $snapshot,
            $task->gross_huf,
            $task->period_start?->format('Y-m-d') ?? '',
            $task->period_end?->format('Y-m-d') ?? '',
        );

        /*
         * A timeout means the document may already exist. Ask the agent by
         * order number before deciding anything.
         */
        if ($result['status'] === 'uncertain') {
            $check = $this->szamlazz->queryByOrderNumber($task->order_number);

            if ($check['status'] === 'issued') {
                $result = $check;
            } else {
                // Still unknown: flag for admin review, do not retry blindly.
                $task->forceFill([
                    'status' => InvoiceTask::UNCERTAIN,
                    'error' => $result['error'] ?? 'Bizonytalan agent válasz.',
                ])->save();

                return $task;
            }
        }

        if ($result['status'] === 'issued') {
            $task->forceFill([
                'status' => InvoiceTask::ISSUED,
                'invoice_number' => $result['invoice_number'],
                'error' => null,
                'issued_at' => now(),
                // Számlázz.hu mails the document itself.
                'email_status' => 'sent_by_provider',
            ])->save();
        } else {
            $task->forceFill([
                'status' => InvoiceTask::FAILED,
                'error' => $result['error'] ?? 'Ismeretlen hiba.',
            ])->save();

            Log::warning('Invoice task failed.', [
                'task_id' => $task->id,
                'error' => $result['error'] ?? null,
            ]);
        }

        return $task;
    }

    /**
     * The buyer fields the agent requires on every document.
     *
     * @param  array<string, mixed>  $snapshot
     * @return array<int, string>
     */
    private function missingBuyerData(array $snapshot): array
    {
        $required = [
            'name' => 'név',
            'city' => 'település',
            'address' => 'cím',
        ];

        $missing = [];

        foreach ($required as $field => $label) {
            if (trim((string) ($snapshot[$field] ?? '')) === '') {
                $missing[] = $label;
            }
        }

        return $missing;
    }

    /**
     * Freeze the seller's current billing details for the document.
     *
     * Missing details are recorded as empty strings rather than omitted, so a
     * later profile edit cannot be mistaken for the original data.
     */
    private function billingSnapshot(User $user): array
    {
        $profile = BillingProfile::where('user_id', $user->id)->first();

        return [
            'name' => $profile?->name ?? $user->name,
            'email' => $profile?->email ?? $user->email,
            'country' => $profile?->country ?? 'HU',
            'postal_code' => $profile?->postal_code ?? '',
            'city' => $profile?->city ?? '',
            'address' => $profile?->address ?? '',
            'tax_number' => $profile?->tax_number ?? '',
            'type' => $profile?->type ?? BillingProfile::INDIVIDUAL,
        ];
    }
}

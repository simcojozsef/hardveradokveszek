<?php

namespace App\Console\Commands;

use App\Models\InvoiceTask;
use App\Services\SubscriptionPaymentService;
use Illuminate\Console\Command;

/*
 * Retries invoice tasks that did not finish.
 *
 * Only tasks that are still outstanding are attempted, and a bounded number
 * of times — a task the agent keeps rejecting needs an admin, not an infinite
 * loop. 'uncertain' is retried too, because processInvoiceTask resolves it by
 * querying the existing document first.
 */
class RetryInvoiceTasks extends Command
{
    protected $signature = 'invoices:retry {--limit=20} {--max-attempts=5}';

    protected $description = 'Retry pending, failed and uncertain invoice tasks';

    public function handle(SubscriptionPaymentService $payments): int
    {
        $maxAttempts = (int) $this->option('max-attempts');

        $tasks = InvoiceTask::query()
            ->whereIn('status', [
                InvoiceTask::PENDING,
                InvoiceTask::FAILED,
                InvoiceTask::UNCERTAIN,
            ])
            ->where('attempts', '<', $maxAttempts)
            ->orderBy('id')
            ->limit((int) $this->option('limit'))
            ->get();

        if ($tasks->isEmpty()) {
            $this->info('Nincs újrapróbálható számla task.');

            return self::SUCCESS;
        }

        $issued = 0;

        foreach ($tasks as $task) {
            $updated = $payments->processInvoiceTask($task);

            if ($updated->status === InvoiceTask::ISSUED) {
                $issued++;
            }
        }

        $this->info("Feldolgozva: {$tasks->count()}, kiállítva: {$issued}");

        return self::SUCCESS;
    }
}

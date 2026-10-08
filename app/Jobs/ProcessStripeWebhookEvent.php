<?php

namespace App\Jobs;

use App\Models\StripeWebhookEvent;
use App\Services\StripeWebhookHandler;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/*
 * Runs the business logic for one stored Stripe event.
 *
 * Kept on the queue so a slow invoicing call cannot delay the webhook
 * response. The queues are database-backed in this project, so this job is a
 * no-op latency-wise until a worker is added; the design stays correct either
 * way.
 */
class ProcessStripeWebhookEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public function __construct(
        public readonly int $eventRowId,
    ) {
    }

    /** Back off progressively: a transient Stripe or invoicing hiccup. */
    public function backoff(): array
    {
        return [10, 30, 120, 300];
    }

    public function handle(StripeWebhookHandler $handler): void
    {
        $record = StripeWebhookEvent::find($this->eventRowId);

        if (!$record) {
            return;
        }

        // Already finished on an earlier attempt.
        if ($record->status === StripeWebhookEvent::PROCESSED) {
            return;
        }

        try {
            $result = $handler->handle($record->type, $record->payload ?? []);

            $record->forceFill([
                'status' => $result === 'ignored'
                    ? StripeWebhookEvent::IGNORED
                    : StripeWebhookEvent::PROCESSED,
                'error' => null,
                'processed_at' => now(),
            ])->save();
        } catch (\Throwable $exception) {
            Log::error('Stripe webhook processing failed.', [
                'event_id' => $record->stripe_event_id,
                'type' => $record->type,
                'message' => $exception->getMessage(),
            ]);

            $record->forceFill([
                'status' => StripeWebhookEvent::FAILED,
                'error' => $exception->getMessage(),
            ])->save();

            // Re-throw so the queue records the attempt and retries.
            throw $exception;
        }
    }
}

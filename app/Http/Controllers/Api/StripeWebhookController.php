<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessStripeWebhookEvent;
use App\Models\StripeWebhookEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;

/*
 * Receives Stripe webhook deliveries.
 *
 * Security notes:
 *  - the signature is verified against the RAW request body, so the payload
 *    must not be parsed before this point
 *  - a duplicate event id is acknowledged without reprocessing, because a
 *    successful storage does not mean a successful processing
 *  - the HTTP answer is sent quickly; the real work runs on the queue, so a
 *    slow downstream (invoicing) cannot make Stripe retry and duplicate
 */
class StripeWebhookController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $secret = config('services.stripe.webhook_secret');

        if (!$secret) {
            Log::error('Stripe webhook received but no signing secret is configured.');

            return response()->json(['message' => 'Webhook not configured.'], 503);
        }

        try {
            /*
             * Construct the event from the raw body: using the parsed input
             * would break the signature check.
             */
            $event = Webhook::constructEvent(
                $request->getContent(),
                (string) $request->header('Stripe-Signature'),
                $secret,
            );
        } catch (SignatureVerificationException $exception) {
            // Invalid signature: refuse and never store it.
            Log::warning('Stripe webhook signature verification failed.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json(['message' => 'Invalid signature.'], 400);
        } catch (\Throwable $exception) {
            return response()->json(['message' => 'Invalid payload.'], 400);
        }

        $eventId = $event->id;

        /*
         * Idempotency: the unique key on the Stripe event id means a repeated
         * delivery is recognised here. Stored does not imply processed, so a
         * row that is still pending is queued again.
         */
        $record = StripeWebhookEvent::firstOrCreate(
            ['stripe_event_id' => $eventId],
            [
                'type' => $event->type,
                'status' => StripeWebhookEvent::RECEIVED,
                'payload' => json_decode($request->getContent(), true),
            ]
        );

        if ($record->wasRecentlyCreated || $record->status === StripeWebhookEvent::FAILED) {
            $record->forceFill([
                'status' => StripeWebhookEvent::QUEUED,
                'error' => null,
            ])->save();

            ProcessStripeWebhookEvent::dispatch($record->id);
        }

        // Always answer fast; the queue does the work.
        return response()->json(['received' => true]);
    }
}

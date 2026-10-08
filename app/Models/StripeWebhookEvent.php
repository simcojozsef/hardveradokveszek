<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/*
 * A stored Stripe webhook delivery.
 *
 * The event is persisted BEFORE processing, so a crash mid-handling cannot
 * make us answer "OK" for work we never completed. The unique event id also
 * means a Stripe retry is recognised instead of processed twice.
 */
class StripeWebhookEvent extends Model
{
    public const RECEIVED = 'received';

    public const QUEUED = 'queued';

    public const PROCESSED = 'processed';

    public const FAILED = 'failed';

    public const IGNORED = 'ignored';

    protected $fillable = [
        'stripe_event_id',
        'type',
        'status',
        'error',
        'payload',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'processed_at' => 'datetime',
        ];
    }
}

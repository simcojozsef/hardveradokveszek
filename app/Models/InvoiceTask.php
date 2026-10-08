<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/*
 * A billing document task for one paid PRO period.
 *
 * Two independent outcomes are tracked:
 *  - status:       the document itself (issued / failed / uncertain)
 *  - email_status: Számlázz.hu's own delivery of that document
 *
 * If the document exists but the mail failed, only the mail is retried; no
 * second invoice is produced.
 */
class InvoiceTask extends Model
{
    public const PENDING = 'pending';

    public const PROCESSING = 'processing';

    public const ISSUED = 'issued';

    public const FAILED = 'failed';

    public const UNCERTAIN = 'uncertain';

    protected $fillable = [
        'user_id',
        'subscription_id',
        'stripe_invoice_id',
        'buyer_snapshot',
        'gross_huf',
        'currency',
        'period_start',
        'period_end',
        'status',
        'email_status',
        'invoice_number',
        'error',
        'order_number',
        'attempts',
        'issued_at',
        // Corrective document and admin review.
        'correction_status',
        'correction_invoice_number',
        'correction_type',
        'correction_reason',
        'corrected_at',
        'review_status',
        'review_note',
    ];

    protected function casts(): array
    {
        return [
            'buyer_snapshot' => 'array',
            'gross_huf' => 'integer',
            'period_start' => 'date',
            'period_end' => 'date',
            'attempts' => 'integer',
            'issued_at' => 'datetime',
            'corrected_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /** Finished, whichever way it went — no further automatic attempts. */
    public function isResolved(): bool
    {
        return in_array($this->status, [self::ISSUED, self::FAILED], true);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/*
 * One paid PRO period. The (subscription, period_start, period_end) triple is
 * unique, which is what makes crediting a period idempotent: a replayed
 * invoice.paid matches the existing row instead of granting a second period
 * and a second set of bumps.
 */
class SubscriptionPeriod extends Model
{
    protected $fillable = [
        'subscription_id',
        'period_start',
        'period_end',
        'bumps_granted',
        'bumps_used',
        'invoice_task_created_at',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'datetime',
            'period_end' => 'datetime',
            'bumps_granted' => 'integer',
            'bumps_used' => 'integer',
            'invoice_task_created_at' => 'datetime',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function bumpsRemaining(): int
    {
        return max(0, $this->bumps_granted - $this->bumps_used);
    }
}

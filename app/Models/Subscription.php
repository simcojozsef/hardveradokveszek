<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/*
 * Local mirror of a Stripe subscription.
 *
 * Statuses a seller may hold:
 *   incomplete, trialing, active, past_due, canceled, unpaid, incomplete_expired
 *
 * The row is a cache of Stripe's view; entitlement always comes from
 * users.pro_entitled_until, which only a verified payment extends.
 */
class Subscription extends Model
{
    /** Statuses that grant PRO while the paid period lasts. */
    public const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

    /**
     * Statuses that mean a subscription is still in flight or live.
     *
     * 'incomplete' is included on purpose: it is what an abandoned or pending
     * Checkout leaves behind, and it must block a second parallel checkout so
     * one seller cannot open two subscriptions.
     */
    public const OPEN_STATUSES = [
        'incomplete',
        'active',
        'trialing',
        'past_due',
        'unpaid',
    ];

    protected $fillable = [
        'user_id',
        'stripe_subscription_id',
        'stripe_customer_id',
        'stripe_price_id',
        'status',
        'cancel_at_period_end',
        'current_period_start',
        'current_period_end',
        'canceled_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'cancel_at_period_end' => 'boolean',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'canceled_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function periods(): HasMany
    {
        return $this->hasMany(SubscriptionPeriod::class);
    }

    /** A subscription that still counts as live or in flight. */
    public function isLive(): bool
    {
        return in_array($this->status, self::ACTIVE_STATUSES, true);
    }
}

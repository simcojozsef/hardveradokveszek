<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OrderSellerGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'store_id',
        'status',
        'total',
        'buyer_confirmation_status',
        'buyer_confirmation_deadline_at',
        'buyer_confirmed_at',
        'buyer_rejected_at',
    ];

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'buyer_confirmation_deadline_at' => 'datetime',
            'buyer_confirmed_at' => 'datetime',
            'buyer_rejected_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            OrderItem::class,
            'order_id',
            'order_id'
        )->where('store_id', $this->store_id);
    }
    public function refund(): HasOne
    {
        return $this->hasOne(Refund::class);
    }
}
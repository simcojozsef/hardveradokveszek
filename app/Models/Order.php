<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'status',
        'total',

        'buyer_name',
        'buyer_email',
        'buyer_phone',

        'shipping_postal_code',
        'shipping_city',
        'shipping_address',

        'buyer_received_at',
        'buyer_rejected_at',
    ];

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'buyer_received_at' => 'datetime',
            'buyer_rejected_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
    public function sellerGroups(): HasMany
    {
        return $this->hasMany(OrderSellerGroup::class);
    }
}
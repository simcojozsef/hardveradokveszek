<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Refund extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_seller_group_id',
        'user_id',
        'amount',
        'first_name',
        'last_name',
        'bank_name',
        'iban',
        'swift_code',
        'account_number',
        'email',
        'phone',
        'status',
        'requested_at',
        'completed_at',
        'payment_proof_path',
        'seller_note',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'requested_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function orderSellerGroup(): BelongsTo
    {
        return $this->belongsTo(OrderSellerGroup::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
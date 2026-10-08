<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/*
 * The seller's current billing identity, used to prefill the next checkout.
 *
 * Historical invoices keep their own snapshot, so editing this row never
 * rewrites an issued document.
 */
class BillingProfile extends Model
{
    public const INDIVIDUAL = 'individual';

    public const COMPANY = 'company';

    protected $fillable = [
        'user_id',
        'type',
        'name',
        'email',
        'country',
        'postal_code',
        'city',
        'address',
        'tax_number',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isCompany(): bool
    {
        return $this->type === self::COMPANY;
    }
}

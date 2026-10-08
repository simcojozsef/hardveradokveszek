<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/*
 * One counted view.
 *
 * Deliberately has no IP address and no device data column: the visitor is
 * represented only by a session-derived hash (guests) or a user id (signed in).
 */
class ProductView extends Model
{
    protected $fillable = [
        'product_id',
        'user_id',
        'viewer_hash',
        'viewed_at',
        'viewed_on',
        'bucket',
    ];

    protected function casts(): array
    {
        return [
            'viewed_at' => 'datetime',
            'viewed_on' => 'date',
            'bucket' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

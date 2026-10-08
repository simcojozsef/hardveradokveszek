<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/*
 * A parsed import waiting to be committed.
 *
 * The preview and the commit are separate requests, so the parsed rows and a
 * content fingerprint are stored. A commit must present the same fingerprint
 * it previewed; otherwise the file changed underneath and is re-checked.
 */
class ProductImport extends Model
{
    public const MODE_CREATE = 'create';

    public const MODE_PRICE_STOCK = 'price_stock';

    public const PENDING = 'pending';

    public const COMMITTED = 'committed';

    public const FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'mode',
        'content_fingerprint',
        'row_count',
        'valid_count',
        'error_count',
        'status',
        'rows',
        'errors',
        'expires_at',
        'committed_at',
    ];

    protected function casts(): array
    {
        return [
            'rows' => 'array',
            'errors' => 'array',
            'row_count' => 'integer',
            'valid_count' => 'integer',
            'error_count' => 'integer',
            'expires_at' => 'datetime',
            'committed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/*
 * One bulk upload.
 *
 * Products created by an import carry the batch id, which lets an admin take
 * the whole upload offline in a single action. Hand-created products have no
 * batch and are never affected.
 */
class ProductImportBatch extends Model
{
    public const ACTIVE = 'active';

    public const DISABLED = 'disabled';

    protected $fillable = [
        'store_id',
        'user_id',
        'label',
        'product_count',
        'status',
        'disabled_at',
    ];

    protected function casts(): array
    {
        return [
            'product_count' => 'integer',
            'disabled_at' => 'datetime',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'import_batch_id');
    }

    public function isActive(): bool
    {
        return $this->status === self::ACTIVE;
    }
}

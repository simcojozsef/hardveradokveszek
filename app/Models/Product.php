<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    public const AVAILABLE = 'available';
    public const IN_PROGRESS = 'in_progress';
    public const SOLD = 'sold';
    public const EXPIRED = 'expired';
    public const REMOVED = 'removed';

    protected static function booted(): void
    {
        static::creating(function (Product $product) {
            // Only creation starts the 60-day window. Editing never renews it.
            $product->posted_at = now();
            $product->expires_at = $product->posted_at->copy()->addDays(60);
            $product->listing_status = self::AVAILABLE;
            $product->sold_at = null;
            $product->expired_at = null;
        });
    }

    public function effectiveListingStatus(?CarbonInterface $at = null): string
    {
        if ($this->trashed()) return self::REMOVED;
        $status = $this->listing_status;
        if (in_array($status, [self::AVAILABLE, self::IN_PROGRESS], true)
            && $this->expires_at && $this->expires_at->lte($at ?? now())) {
            return self::EXPIRED;
        }
        return $status;
    }

    public function isVisibleForSale(): bool
    {
        return $this->is_active && $this->store?->is_active
            && in_array($this->effectiveListingStatus(), [self::AVAILABLE, self::IN_PROGRESS], true)
            && $this->expires_at !== null;
    }

    public function scopeVisibleForSale(Builder $query, ?CarbonInterface $at = null): Builder
    {
        return $query->where($this->qualifyColumn('is_active'), true)
            ->whereIn($this->qualifyColumn('listing_status'), [self::AVAILABLE, self::IN_PROGRESS])
            ->where($this->qualifyColumn('expires_at'), '>', $at ?? now())
            ->whereHas('store', fn ($store) => $store->where('is_active', true));
    }


    protected $fillable = [
        'county_id', 'settlement_id', 'store_id', 'category_id', 'name', 'slug', 'description', 'price', 'stock', 'is_active',
        'condition', 'listing_type', 'county', 'settlement', 'brand', 'model',
        'shipping_available', 'shipping_methods', 'contains_ai', 'has_warranty',
        'warranty_expires_at', 'personal_pickup',
    ];

    protected function casts(): array
    {
        return [
            'county_id' => 'integer', 'settlement_id' => 'integer',
            'posted_at' => 'datetime', 'expires_at' => 'datetime',
            'sold_at' => 'datetime', 'expired_at' => 'datetime',
            'price' => 'decimal:2', 'stock' => 'integer', 'is_active' => 'boolean',
            'shipping_available' => 'boolean', 'shipping_methods' => 'array',
            'contains_ai' => 'boolean', 'has_warranty' => 'boolean',
            'warranty_expires_at' => 'date:Y-m-d', 'personal_pickup' => 'boolean',
        ];
    }

    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
    public function images(): HasMany { return $this->hasMany(ProductImage::class)->orderBy('sort_order'); }

    /**
     * The image used in listings: the flagged primary one, falling back to the
     * first image by sort order. Single source of truth for every endpoint.
     */
    public function primaryImage(): ?ProductImage
    {
        return $this->images->firstWhere('is_primary', true)
            ?? $this->images->first();
    }
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_product')->withTimestamps();
    }

    public function category(): BelongsTo { return $this->belongsTo(Category::class); }
}

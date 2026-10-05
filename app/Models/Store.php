<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    use HasFactory;

    // Only an administrator may set is_trusted_seller.
    protected $fillable = [
        'user_id', 'name', 'slug', 'description', 'logo', 'is_active',
        'contact_phone', 'contact_email',
    ];

    // Populate counts on storefront queries and on stores loaded for products.
    protected $withCount = ['positiveRatings', 'negativeRatings'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'is_trusted_seller' => 'boolean'];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function products(): HasMany { return $this->hasMany(Product::class); }
    public function ratings(): HasMany { return $this->hasMany(StoreRating::class); }
    public function positiveRatings(): HasMany { return $this->ratings()->where('value', 1); }
    public function negativeRatings(): HasMany { return $this->ratings()->where('value', -1); }
    public function getRouteKeyName(): string { return 'slug'; }
}

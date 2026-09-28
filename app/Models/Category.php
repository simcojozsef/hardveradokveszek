<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'parent_id',
    'name',
    'slug',
    'icon',
    'icon_key',
    'description',
    'sort_order',
    'is_active',
])]
class Category extends Model
{
    public function parent(): BelongsTo
    {
        return $this->belongsTo(
            Category::class,
            'parent_id'
        );
    }

    public function children(): HasMany
    {
        return $this->hasMany(
            Category::class,
            'parent_id'
        )->orderBy('sort_order');
    }

    public function products(): HasMany
    {
        return $this->hasMany(
            Product::class
        );
    }
    public function childrenRecursive(): HasMany
    {
        return $this->children()->with('childrenRecursive');
    }
}
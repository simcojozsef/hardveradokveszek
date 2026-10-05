<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreRating extends Model
{
    protected $fillable = ['store_id', 'user_id', 'value'];

    protected function casts(): array
    {
        return ['value' => 'integer'];
    }

    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}

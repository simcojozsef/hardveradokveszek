<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/*
 * A file in a seller's media library.
 *
 * The import file references images by filename, so the library is keyed on
 * (store, name): the name in the spreadsheet resolves to exactly one file the
 * seller actually uploaded. This is what keeps a spreadsheet from pointing at
 * an arbitrary path on the server.
 */
class StoreMedia extends Model
{
    protected $fillable = [
        'store_id',
        'name',
        'path',
        'mime_type',
        'size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** The public URL for this file. */
    public function url(): string
    {
        return url(\Illuminate\Support\Facades\Storage::url($this->path));
    }

    /** The normalised name used for lookups, so casing never matters. */
    public function scopeForName($query, string $name)
    {
        return $query->where('name', strtolower(trim($name)));
    }
}

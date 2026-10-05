<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Settlement extends Model
{
    public $timestamps = false;
    protected $fillable = ['ksh_code', 'county_id', 'name', 'search_name'];
    public function county(): BelongsTo { return $this->belongsTo(County::class); }
}

<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
class County extends Model
{
    public $timestamps = false;
    protected $fillable = ['code', 'name', 'search_name'];
    public function settlements(): HasMany { return $this->hasMany(Settlement::class); }
}

<?php
// Run from project root: php tests/lifecycle.php
// Uses only a separate in-memory SQLite database; never migrates your project database.
use App\Models\Product;
use App\Services\ProductListingLifecycle;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
config(['database.connections.lifecycle_verify' => [
    'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '', 'foreign_key_constraints' => true,
]]);
DB::setDefaultConnection('lifecycle_verify');
function check(bool $ok, string $message): void {
    if (!$ok) throw new RuntimeException($message);
    echo "PASS: {$message}\n";
}
function rejected(callable $action): bool {
    try { $action(); } catch (ValidationException) { return true; }
    return false;
}
try {
    Carbon::setTestNow(Carbon::parse('2026-10-01 12:00:00', 'UTC'));
    Schema::create('stores', function (Blueprint $table) {
        $table->id(); $table->boolean('is_active');
    });
    Schema::create('products', function (Blueprint $table) {
        $table->id(); $table->unsignedBigInteger('store_id');
        $table->string('name'); $table->string('slug');
        $table->decimal('price', 12, 2)->default(0); $table->integer('stock')->default(1);
        $table->boolean('is_active')->default(true); $table->timestamps();
    });
    DB::table('stores')->insert([['id' => 1, 'is_active' => true], ['id' => 2, 'is_active' => false]]);
    DB::table('products')->insert([
        'store_id' => 1, 'name' => 'Legacy', 'slug' => 'legacy',
        'created_at' => now()->subDays(70), 'updated_at' => now()->subDays(5),
    ]);
    $migrations = glob(__DIR__ . '/../database/migrations/*add_product_listing_lifecycle.php');
    check(count($migrations) === 1, 'Exactly one lifecycle migration exists');
    $migration = require $migrations[0];
    $migration->up();
    $legacy = Product::query()->firstOrFail();
    check($legacy->listing_status === Product::EXPIRED, 'Old listings expire during backfill');
    check($legacy->posted_at->equalTo($legacy->created_at), 'Backfill preserves original posting date');
    check($legacy->updated_at->equalTo(now()->subDays(5)), 'Backfill preserves edit timestamp');
    $lifecycle = app(ProductListingLifecycle::class);
    $new = Product::create(['store_id' => 1, 'name' => 'New', 'slug' => 'new', 'is_active' => true]);
    check($new->posted_at->equalTo(now()) && $new->expires_at->equalTo(now()->addDays(60)), 'Creation sets exact 60-day window');
    check(Product::visibleForSale()->whereKey($new->id)->exists(), 'Available listing is public');
    $expiry = $new->expires_at->toISOString();
    $new->update(['name' => 'Edited']);
    check($new->fresh()->expires_at->toISOString() === $expiry, 'Editing does not renew expiry');
    $new = $lifecycle->changeStatus($new, Product::IN_PROGRESS);
    check($new->listing_status === Product::IN_PROGRESS && $new->isVisibleForSale(), 'In-progress listing remains public');
    $new = $lifecycle->changeStatus($new, Product::AVAILABLE);
    check($new->listing_status === Product::AVAILABLE, 'In-progress can return to available');
    $new = $lifecycle->changeStatus($new, Product::SOLD);
    $soldAt = $new->sold_at->toISOString();
    check(!Product::visibleForSale()->whereKey($new->id)->exists() && !$new->isVisibleForSale(), 'Sold listing is hidden');
    Carbon::setTestNow(now()->addMinute());
    check($lifecycle->changeStatus($new, Product::SOLD)->sold_at->toISOString() === $soldAt, 'Repeated sold action preserves sold time');
    check(rejected(fn () => $lifecycle->changeStatus($new, Product::AVAILABLE)), 'Sold listing cannot be reopened');
    $due = Product::create(['store_id' => 1, 'name' => 'Due', 'slug' => 'due']);
    $due = $lifecycle->changeStatus($due, Product::IN_PROGRESS);
    Carbon::setTestNow($due->expires_at->copy());
    check($due->effectiveListingStatus() === Product::EXPIRED && !$due->isVisibleForSale(), 'Expiry boundary is hidden before scheduler runs');
    check(!Product::visibleForSale()->whereKey($due->id)->exists(), 'Query excludes due listing before scheduler runs');
    check(rejected(fn () => $lifecycle->changeStatus($due, Product::IN_PROGRESS)), 'Expired listing cannot be reopened');
    check($lifecycle->expireDue() === 1, 'Expiry command updates due in-progress listing only');
    $due = $due->fresh();
    check($due->listing_status === Product::EXPIRED && $due->expired_at->equalTo($due->expires_at), 'Expiry stores the actual deadline');
    check($lifecycle->expireDue() === 0, 'Expiry is idempotent');
    check($new->fresh()->listing_status === Product::SOLD, 'Expiry never overwrites sold status');
    $lifecycle->remove($new);
    check(Product::find($new->id) === null, 'Removed listing is hidden from default queries');
    $removed = Product::withTrashed()->findOrFail($new->id);
    check($removed->deleted_at !== null && $removed->sold_at->toISOString() === $soldAt, 'Removal time and sold history are retained');
    $private = Product::create(['store_id' => 2, 'name' => 'Private', 'slug' => 'private']);
    check(!Product::visibleForSale()->whereKey($private->id)->exists(), 'Inactive stores remain hidden');
    $inactive = Product::create(['store_id' => 1, 'name' => 'Inactive', 'slug' => 'inactive', 'is_active' => false]);
    check(!Product::visibleForSale()->whereKey($inactive->id)->exists(), 'Inactive products remain hidden');
    echo "All lifecycle checks passed. Your project database was not used.\n";
} finally {
    Carbon::setTestNow();
    DB::disconnect('lifecycle_verify');
}

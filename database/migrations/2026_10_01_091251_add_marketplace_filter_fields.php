<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'category_id')) {
            throw new RuntimeException('The products table needs category_id before this migration. Add it using the optional category migration in the guide.');
        }
        Schema::table('products', function (Blueprint $table) {
            // Unknown condition for existing products; do not mislabel them as new.
            $table->string('condition', 10)->nullable()->index();
            $table->string('listing_type', 10)->default('offer')->index();
            $table->string('county', 100)->nullable()->index();
            $table->string('settlement', 100)->nullable()->index();
            $table->string('brand', 100)->nullable()->index();
            $table->string('model', 100)->nullable();
            $table->boolean('shipping_available')->default(false);
            $table->json('shipping_methods')->nullable();
            // Null means legacy/unclassified, not verified AI-free.
            $table->boolean('contains_ai')->nullable();
            $table->boolean('has_warranty')->default(false);
            $table->date('warranty_expires_at')->nullable();
            $table->boolean('personal_pickup')->default(false);
        });
        Schema::table('stores', function (Blueprint $table) {
            $table->boolean('is_trusted_seller')->default(false)->index();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'condition', 'listing_type', 'county', 'settlement', 'brand', 'model',
                'shipping_available', 'shipping_methods', 'contains_ai', 'has_warranty',
                'warranty_expires_at', 'personal_pickup',
            ]);
        });
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('is_trusted_seller');
        });
    }
};

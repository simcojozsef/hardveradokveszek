<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * The seller's own SKU, used by the import to identify their products.
 *
 * Unique per store, not globally: two sellers may legitimately use the same
 * code for their own inventory.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('seller_sku')->nullable()->after('slug');

            $table->unique(['store_id', 'seller_sku']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['store_id', 'seller_sku']);
            $table->dropColumn('seller_sku');
        });
    }
};

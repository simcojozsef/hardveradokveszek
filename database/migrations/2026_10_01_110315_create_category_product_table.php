<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_product', function (Blueprint $table) {
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['category_id', 'product_id']);
            $table->index('product_id');
        });

        // Preserve the category memberships of existing products.
        DB::table('products')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->select('products.id as id', 'products.category_id')
            ->chunkById(200, function ($products) {
                $now = now();
                $rows = $products->map(fn ($product) => [
                    'category_id' => $product->category_id,
                    'product_id' => $product->id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();
                if ($rows) DB::table('category_product')->insertOrIgnore($rows);
            }, 'products.id', 'id');
    }

    public function down(): void
    {
        Schema::dropIfExists('category_product');
    }
};

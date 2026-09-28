<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_seller_groups', function (Blueprint $table) {
            $table->id();

            $table->foreignId('order_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('store_id')
                ->constrained()
                ->restrictOnDelete();

            $table->string('status')->default('pending');

            $table->decimal('total', 12, 2);

            $table->timestamps();

            $table->unique([
                'order_id',
                'store_id',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_seller_groups');
    }
};
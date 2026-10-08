<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Daily rollup per product and per store.
 *
 * An analytics series must survive the raw event rows, so the daily counts are
 * materialised here. The unique key on (product, day) makes the rollup job
 * idempotent: re-running a day recomputes rather than doubles.
 *
 * The day column is the Budapest calendar day, which is what a seller means by
 * "yesterday"; the event rows keep UTC timestamps for the audit trail.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_product_stats', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();

            // Budapest calendar day.
            $table->date('day');

            $table->unsignedInteger('views')->default(0);

            $table->timestamps();

            $table->unique(['product_id', 'day']);
            $table->index(['store_id', 'day']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_product_stats');
    }
};

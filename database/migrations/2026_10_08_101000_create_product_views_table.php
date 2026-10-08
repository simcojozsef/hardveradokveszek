<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Product view counting.
 *
 * Privacy rules baked into the schema:
 *  - NO raw IP address is stored. The visitor identifier is a hash of a
 *    short-lived first-party session token, so it cannot be reversed into a
 *    person and forgets itself when the session ends.
 *  - no device fingerprint: there is no user-agent, screen or canvas data
 *    column, and one is deliberately not added.
 *
 * A rolling 24-hour window: the unique key on (product, viewer, day bucket)
 * means a repeat view from the same visitor in the same window is ignored at
 * the database level, not merely in application code.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_views', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            // Nullable: a signed-in viewer is identified by user id instead.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // Hash of the first-party session token for guests. Never an IP.
            $table->string('viewer_hash', 64)->nullable();

            // UTC event time, plus the Budapest day it belongs to, so daily
            // grouping needs no timezone work at query time.
            $table->timestamp('viewed_at');
            $table->date('viewed_on');

            // The rolling 24h bucket this view was counted in.
            $table->unsignedBigInteger('bucket');

            $table->timestamps();

            /*
             * One counted view per viewer per product per 24h bucket.
             * The insert that violates this is simply ignored.
             */
            $table->unique(
                ['product_id', 'viewer_hash', 'bucket'],
                'product_views_dedup_unique'
            );

            $table->unique(
                ['product_id', 'user_id', 'bucket'],
                'product_views_user_dedup_unique'
            );

            $table->index(['product_id', 'viewed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_views');
    }
};

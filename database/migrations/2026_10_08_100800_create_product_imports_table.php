<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * A parsed-but-not-yet-committed import.
 *
 * The preview and the commit are separate requests, so the server keeps the
 * parsed rows plus a content fingerprint. A commit must match the fingerprint
 * it previewed, otherwise the file changed underneath and the whole thing is
 * re-checked. Previews expire after 24 hours.
 *
 * Parsed rows and errors live in json: they are a short-lived staging area,
 * not application state, and are deleted with the row.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // 'create' (new draft products) | 'price_stock' (update existing)
            $table->string('mode')->default('create');

            // Hash of the parsed content, so a tampered preview is rejected.
            $table->string('content_fingerprint', 64);

            $table->unsignedInteger('row_count')->default(0);
            $table->unsignedInteger('valid_count')->default(0);
            $table->unsignedInteger('error_count')->default(0);

            // pending | committed | failed | expired
            $table->string('status')->default('pending');

            $table->json('rows')->nullable();
            $table->json('errors')->nullable();

            $table->timestamp('expires_at');
            $table->timestamp('committed_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_imports');
    }
};

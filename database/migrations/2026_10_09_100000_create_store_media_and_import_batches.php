<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * The seller's media library.
 *
 * The import spreadsheet refers to images by filename, so a library row is the
 * only thing a spreadsheet name can resolve to. That keeps a file from
 * pointing at an arbitrary path on the server: no matching library row, no
 * image.
 *
 * A name is unique per store, so two sellers may both use "cover.jpg".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();

            // Lowercase filename, as the seller will type it in the sheet.
            $table->string('name');
            $table->string('path');
            $table->string('mime_type', 64)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);

            $table->timestamps();

            $table->unique(['store_id', 'name']);
        });

        /*
         * Which bulk upload a product came from, so an admin can take a whole
         * batch offline at once without touching products uploaded by hand.
         */
        Schema::create('product_import_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('label');
            $table->unsignedInteger('product_count')->default(0);

            // active | disabled — an admin switch, independent of products.
            $table->string('status')->default('active');
            $table->timestamp('disabled_at')->nullable();

            $table->timestamps();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('import_batch_id')
                ->nullable()
                ->after('store_id')
                ->constrained('product_import_batches')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('import_batch_id');
        });

        Schema::dropIfExists('product_import_batches');
        Schema::dropIfExists('store_media');
    }
};

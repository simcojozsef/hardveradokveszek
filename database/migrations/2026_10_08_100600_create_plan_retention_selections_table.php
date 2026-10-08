<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * The listings a seller wants kept when their PRO period ends.
 *
 * Only the seller's own product ids are accepted; the server verifies
 * ownership. A selection is advisory — the downgrade still caps the result at
 * 10 and fills any gap deterministically.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_retention_selections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();

            // Caps the ordered list at 10 by construction.
            $table->unsignedTinyInteger('position');

            $table->timestamps();

            $table->unique(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_retention_selections');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Billing identity for an outgoing invoice.
 *
 * A later profile edit must never alter an already-issued invoice, so the
 * payment record stores its own immutable snapshot; this table only holds the
 * seller's current details used to prefill the next checkout.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // 'individual' | 'company'
            $table->string('type')->default('individual');

            $table->string('name');               // person name or company name
            $table->string('email');              // billing e-mail

            $table->string('country', 2)->default('HU');
            $table->string('postal_code');
            $table->string('city');
            $table->string('address');

            // Only meaningful for a company with a tax number.
            $table->string('tax_number')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('billing_profiles');
    }
};

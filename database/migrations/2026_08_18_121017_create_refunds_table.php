<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();

            $table->foreignId('order_seller_group_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->decimal('amount', 12, 2);

            $table->string('first_name');
            $table->string('last_name');

            $table->string('bank_name');
            $table->string('iban');
            $table->string('swift_code');
            $table->string('account_number');

            $table->string('email');
            $table->string('phone');

            $table->string('status')
                ->default('refund_requested');

            $table->timestamp('requested_at')
                ->nullable();

            $table->timestamp('completed_at')
                ->nullable();

            $table->string('payment_proof_path')
                ->nullable();

            $table->text('seller_note')
                ->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
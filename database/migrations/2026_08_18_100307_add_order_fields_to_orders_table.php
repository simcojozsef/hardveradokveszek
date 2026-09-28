<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('user_id')
                ->after('id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('status')
                ->default('pending')
                ->after('user_id');

            $table->decimal('total', 12, 2)
                ->after('status');

            $table->timestamp('buyer_received_at')
                ->nullable()
                ->after('total');

            $table->timestamp('buyer_rejected_at')
                ->nullable()
                ->after('buyer_received_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['user_id']);

            $table->dropColumn([
                'user_id',
                'status',
                'total',
                'buyer_received_at',
                'buyer_rejected_at',
            ]);
        });
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'user_id')) {
                $table->foreignId('user_id')
                    ->after('id')
                    ->constrained('users')
                    ->cascadeOnDelete();
            }

            if (!Schema::hasColumn('orders', 'status')) {
                $table->string('status')
                    ->default('pending')
                    ->after('user_id');
            }

            if (!Schema::hasColumn('orders', 'total')) {
                $table->decimal('total', 12, 2)
                    ->after('status');
            }

            if (!Schema::hasColumn('orders', 'buyer_received_at')) {
                $table->timestamp('buyer_received_at')
                    ->nullable()
                    ->after('total');
            }

            if (!Schema::hasColumn('orders', 'buyer_rejected_at')) {
                $table->timestamp('buyer_rejected_at')
                    ->nullable()
                    ->after('buyer_received_at');
            }
        });
    }

    public function down(): void
    {
        throw new \RuntimeException(
            'Rollback requires manual review: some orders columns may predate this migration.'
        );
    }
};
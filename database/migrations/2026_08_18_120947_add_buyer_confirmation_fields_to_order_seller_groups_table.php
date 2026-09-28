<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_seller_groups', function (Blueprint $table) {
            $table->string('buyer_confirmation_status')
                ->nullable()
                ->after('status');

            $table->timestamp('buyer_confirmation_deadline_at')
                ->nullable()
                ->after('buyer_confirmation_status');

            $table->timestamp('buyer_confirmed_at')
                ->nullable()
                ->after('buyer_confirmation_deadline_at');

            $table->timestamp('buyer_rejected_at')
                ->nullable()
                ->after('buyer_confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('order_seller_groups', function (Blueprint $table) {
            $table->dropColumn([
                'buyer_confirmation_status',
                'buyer_confirmation_deadline_at',
                'buyer_confirmed_at',
                'buyer_rejected_at',
            ]);
        });
    }
};
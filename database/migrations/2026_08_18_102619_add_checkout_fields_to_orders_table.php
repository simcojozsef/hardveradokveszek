<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('buyer_name')->nullable()->after('total');
            $table->string('buyer_email')->nullable()->after('buyer_name');
            $table->string('buyer_phone')->nullable()->after('buyer_email');
            $table->string('shipping_postal_code')->nullable()->after('buyer_phone');
            $table->string('shipping_city')->nullable()->after('shipping_postal_code');
            $table->string('shipping_address')->nullable()->after('shipping_city');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'buyer_name',
                'buyer_email',
                'buyer_phone',
                'shipping_postal_code',
                'shipping_city',
                'shipping_address',
            ]);
        });
    }
};
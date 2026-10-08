<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Records that the "expires in 3 days" notice has been raised for a listing,
 * so a repeated scheduler run cannot queue the same warning twice.
 *
 * Cleared on renewal, because the next window deserves its own warning.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->timestamp('expiry_warned_at')->nullable()->after('expired_at');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('expiry_warned_at');
        });
    }
};

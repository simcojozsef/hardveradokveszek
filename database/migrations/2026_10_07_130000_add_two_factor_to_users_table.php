<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Email OTP used as the second factor on password login.
            // Only the hash of the code is stored, never the plain code.
            $table->string('two_factor_code')->nullable()->after('email_verified_at');
            $table->timestamp('two_factor_expires_at')->nullable()->after('two_factor_code');

            // Brute-force guard: how many wrong codes were submitted and when
            // the attempt window started.
            $table->unsignedTinyInteger('two_factor_attempts')->default(0)->after('two_factor_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'two_factor_code',
                'two_factor_expires_at',
                'two_factor_attempts',
            ]);
        });
    }
};

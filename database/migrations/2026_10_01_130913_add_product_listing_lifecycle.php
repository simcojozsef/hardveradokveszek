<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('listing_status', 20)->default('available');
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('sold_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->softDeletes(); // deleted_at records seller removal, without erasing history.
            $table->index(['listing_status', 'expires_at']);
        });

        $now = Carbon::now();
        DB::table('products')->orderBy('id')->chunkById(200, function ($products) use ($now) {
            foreach ($products as $product) {
                $posted = $product->created_at ? Carbon::parse($product->created_at) : $now->copy();
                $expires = $posted->copy()->addDays(60);
                $expired = $expires->lte($now);
                DB::table('products')->where('id', $product->id)->update([
                    'posted_at' => $posted, 'expires_at' => $expires,
                    'listing_status' => $expired ? 'expired' : 'available',
                    'expired_at' => $expired ? $expires : null,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['listing_status', 'expires_at']);
            $table->dropSoftDeletes();
            $table->dropColumn(['listing_status', 'posted_at', 'expires_at', 'sold_at', 'expired_at']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Adds the plan/subscription foundation.
 *
 * Business rules honoured here:
 *  - Existing sellers migrate to the free plan untouched; nothing is deleted
 *    or archived.
 *  - pro_entitled_until is the authoritative local entitlement. A Stripe
 *    status alone never grants PRO, so this is the only field the gates read.
 *  - The one-off transition marker lets accounts that already had more than 10
 *    active listings keep them until they expire, while still capping new
 *    publishes at 10.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Paid-through date. NULL means free. Only a verified payment sets it.
            $table->timestamp('pro_entitled_until')->nullable()->after('provider_id');

            // One-time migration grace for accounts already above the free cap.
            $table->timestamp('plan_migration_grace_until')->nullable()->after('pro_entitled_until');

            $table->string('stripe_customer_id')->nullable()->after('plan_migration_grace_until');
        });

        Schema::table('products', function (Blueprint $table) {
            // Pre-reservation ("előresorolás"). Kept separate from published_at,
            // expires_at and created_at, which must never change on a bump.
            $table->timestamp('bumped_at')->nullable()->after('posted_at');

            // Why a listing was taken offline by the plan rules, so the seller
            // sees a reason and can reactivate by hand.
            $table->string('archived_reason')->nullable()->after('expired_at');
            $table->timestamp('archived_at')->nullable()->after('archived_reason');

            $table->index(['store_id', 'bumped_at']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'pro_entitled_until',
                'plan_migration_grace_until',
                'stripe_customer_id',
            ]);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'bumped_at']);
            $table->dropColumn(['bumped_at', 'archived_reason', 'archived_at']);
        });
    }
};

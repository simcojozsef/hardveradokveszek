<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Links a corrective document (storno / helyesbítő) to the original invoice.
 *
 * A refund does NOT itself cancel the Stripe subscription and does NOT
 * automatically revoke PRO — both are deliberate admin decisions, and the
 * accounting treatment is finalised with the accountant. These fields only
 * record what an admin did and why.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_tasks', function (Blueprint $table) {
            // none | pending | issued | failed | uncertain
            $table->string('correction_status')->default('none')->after('email_status');

            $table->string('correction_invoice_number')->nullable()->after('correction_status');
            $table->string('correction_type')->nullable()->after('correction_invoice_number');
            $table->text('correction_reason')->nullable()->after('correction_type');
            $table->timestamp('corrected_at')->nullable()->after('correction_reason');

            // A refunded or disputed payment is flagged for review and never
            // silently re-activates PRO from an old invoice.paid event.
            $table->string('review_status')->nullable()->after('corrected_at');
            $table->text('review_note')->nullable()->after('review_status');
        });
    }

    public function down(): void
    {
        Schema::table('invoice_tasks', function (Blueprint $table) {
            $table->dropColumn([
                'correction_status',
                'correction_invoice_number',
                'correction_type',
                'correction_reason',
                'corrected_at',
                'review_status',
                'review_note',
            ]);
        });
    }
};

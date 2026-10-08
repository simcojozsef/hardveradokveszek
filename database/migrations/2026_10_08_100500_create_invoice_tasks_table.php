<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * One invoice task per paid PRO period.
 *
 * The unique key is the Stripe invoice id: a replayed webhook finds the
 * existing row instead of issuing a second document. Document status and
 * e-mail status are tracked separately, because Számlázz.hu sends the mail
 * itself and a failed mail must not produce a new invoice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_tasks', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();

            // Idempotency anchor: one task per Stripe invoice.
            $table->string('stripe_invoice_id')->unique();

            // Frozen billing snapshot, so a later profile edit cannot rewrite
            // an already-issued document.
            $table->json('buyer_snapshot');

            $table->unsignedInteger('gross_huf');
            $table->string('currency', 3)->default('HUF');

            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();

            // pending | processing | issued | failed | uncertain
            $table->string('status')->default('pending');
            // Separate: the document may exist even when the mail failed.
            $table->string('email_status')->default('pending');

            $table->string('invoice_number')->nullable();
            $table->text('error')->nullable();

            // Our own order number sent to the agent, used to query on timeout.
            $table->string('order_number');

            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('issued_at')->nullable();

            $table->timestamps();

            $table->index(['status', 'attempts']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_tasks');
    }
};

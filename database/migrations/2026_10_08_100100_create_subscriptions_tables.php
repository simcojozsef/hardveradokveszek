<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Local Stripe subscription state, one row per seller subscription.
 *
 * The uniqueness rules encode the spec:
 *  - a seller has at most one live/pending subscription at a time
 *  - a paid period is identified by (subscription, period start, period end)
 *    so a late or replayed invoice cannot credit a period twice
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Stripe identifiers. The server writes these, never the client.
            $table->string('stripe_subscription_id')->nullable()->unique();
            $table->string('stripe_customer_id')->nullable();
            $table->string('stripe_price_id')->nullable();

            $table->string('status')->default('incomplete');
            $table->boolean('cancel_at_period_end')->default(false);

            // The paid-through boundary. This is what entitlement is derived from.
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();

            $table->timestamp('canceled_at')->nullable();
            $table->timestamp('ended_at')->nullable();

            $table->timestamps();

            // Fast lookup for "does this seller already have a live subscription".
            $table->index(['user_id', 'status']);
        });

        /*
         * One row per paid PRO period. Unique on the period identity so a
         * replayed invoice.paid cannot grant a second period, a second set of
         * 5 bumps, or a second invoice task.
         */
        Schema::create('subscription_periods', function (Blueprint $table) {
            $table->id();

            $table->foreignId('subscription_id')->constrained()->cascadeOnDelete();

            $table->timestamp('period_start');
            $table->timestamp('period_end');

            // Bumps granted for this period and how many were consumed.
            $table->unsignedTinyInteger('bumps_granted')->default(5);
            $table->unsignedTinyInteger('bumps_used')->default(0);

            // Set once the billing document task has been queued for this period.
            $table->timestamp('invoice_task_created_at')->nullable();

            $table->timestamps();

            $table->unique(
                ['subscription_id', 'period_start', 'period_end'],
                'subscription_periods_identity_unique'
            );
        });

        /*
         * Incoming Stripe webhook events. Stored before processing so a crash
         * cannot make us answer OK for work we never did, and so a duplicate
         * delivery is recognised by its unique event id.
         */
        Schema::create('stripe_webhook_events', function (Blueprint $table) {
            $table->id();

            $table->string('stripe_event_id')->unique();
            $table->string('type');
            $table->string('status')->default('received');
            $table->text('error')->nullable();

            // Full payload for auditing and for re-running a failed event.
            $table->json('payload')->nullable();

            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_webhook_events');
        Schema::dropIfExists('subscription_periods');
        Schema::dropIfExists('subscriptions');
    }
};

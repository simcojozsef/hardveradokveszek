<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 16)->default('open');
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->unique(['store_id', 'buyer_id']);
            $table->index(['store_id', 'last_message_at']);
        });

        Schema::create('store_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')
                ->constrained('store_conversations')->cascadeOnDelete();
            $table->foreignId('sender_id')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_messages');
        Schema::dropIfExists('store_conversations');
    }
};

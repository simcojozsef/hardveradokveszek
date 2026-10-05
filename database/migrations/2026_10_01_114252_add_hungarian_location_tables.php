<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('counties', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 100);
            $table->string('search_name', 100)->index();
        });
        Schema::create('settlements', function (Blueprint $table) {
            $table->id();
            $table->string('ksh_code', 5)->unique();
            $table->foreignId('county_id')->constrained('counties');
            $table->string('name', 100);
            $table->string('search_name', 100)->index();
            $table->unique(['county_id', 'name']);
            $table->index('county_id');
        });
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('county_id')->nullable()->constrained('counties')->nullOnDelete();
            $table->foreignId('settlement_id')->nullable()->constrained('settlements')->nullOnDelete();
            $table->index('county_id');
            $table->index('settlement_id');
        });
    }
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('settlement_id');
            $table->dropConstrainedForeignId('county_id');
        });
        Schema::dropIfExists('settlements');
        Schema::dropIfExists('counties');
    }
};

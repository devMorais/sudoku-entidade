<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('pin', 6)->unique(); // O código que vai pro projetor
            $table->json('puzzle'); // A matriz do Sudoku com os buracos
            $table->json('solution'); // A matriz resolvida (gabarito)
            $table->string('status')->default('waiting'); // waiting, playing, finished
            $table->unsignedBigInteger('winner_id')->nullable(); // Quem derrotou a Entidade primeiro
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};

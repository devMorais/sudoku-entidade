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
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete(); // Conecta o jogador à sala
            $table->string('name'); // Nome do aluno
            $table->boolean('is_leader')->default(false); // O primeiro a entrar pode dar o "Start"
            $table->timestamp('finished_at')->nullable(); // Marca o exato milissegundo que ele venceu
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};

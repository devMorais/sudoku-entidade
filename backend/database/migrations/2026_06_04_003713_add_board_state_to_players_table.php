<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->json('board_state')->nullable()->after('finished_at');
            $table->integer('errors_count')->default(0)->after('board_state');
            $table->integer('filled_count')->default(0)->after('errors_count');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['board_state', 'errors_count', 'filled_count']);
        });
    }
};

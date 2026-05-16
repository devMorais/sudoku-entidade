<?php

use App\Http\Controllers\GameController;
use Illuminate\Support\Facades\Route;

// Rotas do Protocolo Fantasma — Operação Multiplayer Competitiva
Route::post('/rooms', [GameController::class, 'createRoom']);
Route::post('/rooms/join', [GameController::class, 'joinRoom']);
Route::post('/rooms/{pin}/start', [GameController::class, 'startGame']);
Route::post('/rooms/{pin}/victory', [GameController::class, 'claimVictory']);
Route::post('/rooms/{pin}/eliminate', [GameController::class, 'eliminatePlayer']);

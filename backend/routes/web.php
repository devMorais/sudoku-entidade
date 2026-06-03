<?php

use Illuminate\Support\Facades\Route;

// Redireciona todas as rotas para o index.html do Angular (SPA)
Route::get('/{any}', function () {
    return file_get_contents(public_path('index.html'));
})->where('any', '.*');

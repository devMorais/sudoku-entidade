<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Entidade vs. Ethan — Sudoku</title>

    <link rel="stylesheet" href="{{ asset('css/sudoku.css') }}">
</head>

<body>

    <div id="qr-modal">
        <img id="qr-modal-img" src="" alt="QR Code Fullscreen">
        <div class="qr-modal-text">CLIQUE PARA FECHAR</div>
    </div>

    @yield('content')

    <script src="https://cdnjs.cloudflare.com/ajax/libs/pusher/8.3.0/pusher.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/laravel-echo@1.16.1/dist/echo.iife.js"></script>

    <script src="{{ asset('js/sudoku.js') }}"></script>
</body>

</html>

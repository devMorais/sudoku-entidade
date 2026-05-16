<?php

if (! function_exists('asset_versionado')) {
    /**
     * Gera a URL do asset com um número de versão baseado na data de modificação (Cache Busting)
     *
     * @param string $path Caminho relativo do arquivo (ex: 'js/sudoku.js')
     * @return string
     */
    function asset_versionado(string $path): string
    {
        // Pega o caminho real do arquivo no servidor (ex: C:\Herd\...\public\js\sudoku.js)
        $caminhoFisico = public_path($path);

        // Gera a versão baseada na data de modificação
        $versao = file_exists($caminhoFisico) ? filemtime($caminhoFisico) : '1';

        // Retorna a URL completa já com o parâmetro ?v=123456789
        return asset($path) . '?v=' . $versao;
    }
}

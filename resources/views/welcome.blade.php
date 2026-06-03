@extends('layouts.app')

@section('content')

<div id="tutorial-screen" class="screen active">
    <div class="mi-logo">
        <p class="eyebrow">// Atividade Avaliativa I — IA Responsável</p>
        <h1>Missão: Impossível</h1>
        <p class="sub">Manual de Infiltração</p>
        <div class="rule"></div>
    </div>

    <div class="tut-container">
        <div class="tut-header">
            <h1>Diretrizes da Missão</h1>
            <p>Leia atentamente antes de abrir as portas do mainframe.</p>
        </div>

        <div class="tut-grid">
            <div class="tut-card">
                <span class="tut-icon">🧩</span>
                <h3>Matriz Lógica</h3>
                <p>Preencha as células vazias usando números de <strong>1 a 9</strong>. Nenhum número pode se repetir na
                    mesma linha, coluna ou bloco delimitado de 3x3.</p>
            </div>
            <div class="tut-card">
                <span class="tut-icon">🤖</span>
                <h3>A Entidade IA</h3>
                <p>A Inteligência Artificial previu os caminhos normais. Use o botão <strong>BENJI</strong> para fazer
                    anotações de hipóteses táticas nas células e contornar a máquina.</p>
            </div>
            <div class="tut-card danger">
                <span class="tut-icon">⚔️</span>
                <h3>Battle Royale Síncrono</h3>
                <p>Todos na sala resolvem o mesmo grid. O primeiro que decifrar o código tranca a rede e vence. Cometer
                    5 erros causa a sua <strong>eliminação imediata</strong> do servidor.</p>
            </div>
        </div>

        <button class="btn-large" id="btn-understood">INICIALIZAR REPOSITÓRIO</button>
    </div>
</div>

<div id="intro" class="screen">
    <div class="mi-logo">
        <p class="eyebrow">// Atividade Avaliativa I — IA Responsável</p>
        <h1>Missão: Impossível</h1>
        <p class="sub">O Acerto Final</p>
        <div class="rule"></div>
    </div>

    <div class="launch-panel">
        <div class="launch-col" id="col-left">
            <p class="conn-num" id="lbl-solo" style="color: var(--red); font-weight: 900; letter-spacing: 2px;">//
                OPERAÇÃO SOLO</p>

            <div class="diff-row" id="diff-select">
                <button class="diff-btn active" data-d="easy">Fácil</button>
                <button class="diff-btn" data-d="medium">Médio</button>
                <button class="diff-btn" data-d="hard">Difícil</button>
            </div>

            <div id="qr-container" title="Clique para Ampliar">
                <p
                    style="font-family:var(--mono); color:var(--white); font-weight:bold; font-size:0.85rem; letter-spacing:1px; text-align:center;">
                    ESCANEIE PARA ENTRAR NA REDE</p>
                <div class="qr-box"><img id="qr-image" src="" alt="QR Code"></div>
                <p
                    style="font-family:var(--mono); color:var(--cyan); font-size:0.7rem; margin-top:5px; text-align:center;">
                    (Clique no QR Code para ampliar)</p>
            </div>

            <button class="btn-start" id="btn-start">▶ INICIAR MISSÃO SOLO</button>
        </div>

        <div class="launch-col" style="border-left: 1px solid var(--border); padding-left: 2.5rem;" id="mp-side-panel">
            <p class="conn-num" id="lbl-rede" style="color: var(--cyan); font-weight: 900; letter-spacing: 2px;">//
                PROTOCOLO FANTASMA (REDE)</p>

            <div id="mp-initial-choices"
                style="display:flex; flex-direction:column; gap:12px; width:100%; margin-top: 10px;">
                <button class="action-btn join" id="btn-intent-join">ENTRAR EM SALA EXISTENTE</button>
                <button class="action-btn create" id="btn-intent-create">CRIAR NOVA SALA</button>
            </div>

            <div id="form-join" class="form-section">
                <input type="text" id="join-pin" placeholder="PIN DE ACESSO DA SALA" class="mp-input" maxlength="4">
                <input type="text" id="join-name" placeholder="CODNOME (EX: CLAUDIA)" class="mp-input" maxlength="30">
                <button class="action-btn join" id="btn-do-join">⚡ AUTENTICAR NA REDE</button>
                <button class="action-btn back btn-back-menu">⮌ Voltar</button>
            </div>

            <div id="form-create" class="form-section">
                <input type="text" id="create-name" placeholder="CODNOME DO LÍDER" class="mp-input" maxlength="30">
                <button class="action-btn create" id="btn-do-create">🖥️ GERAR SALA E EXTENSÃO</button>
                <button class="action-btn back btn-back-menu">⮌ Voltar</button>
            </div>

            <div id="lobby-view">
                <div
                    style="text-align:center; background: #131326; border: 1px solid var(--border2); border-radius: 8px; padding: 15px; width: 100%; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);">
                    <p
                        style="font-family:var(--mono); color:var(--muted2); font-size:0.85rem; font-weight:bold; letter-spacing:2px; margin-bottom:5px;">
                        PIN DE ACESSO MANUAL</p>
                    <div id="lobby-pin-display"
                        style="font-family:var(--display); font-size:3.2rem; color:var(--cyan); font-weight:900; letter-spacing:8px; text-shadow: 0 0 20px rgba(0,212,255,0.5);">
                        ----</div>
                </div>
                <ul class="agent-list" id="agent-list"></ul>
            </div>
        </div>
    </div>

    <div id="status-intro">Aguardando definição de rota...</div>

    <p class="mi-divider">— AS 4 CONEXÕES ENTRE O SUDOKU E A ENTIDADE —</p>

    <div class="connections">
        <div class="conn-card">
            <p class="conn-num">01 / A ENTIDADE</p>
            <p class="conn-title">A Luta contra o Algoritmo</p>
            <p class="conn-text">A IA calcula todas as probabilidades e prevê cada movimento. O tabuleiro é um sistema
                fechado de lógica — encontre o espaço vazio que ela não previu.</p>
        </div>
        <div class="conn-card">
            <p class="conn-num">02 / BATTLE ROYALE</p>
            <p class="conn-title">Modo Morte Súbita</p>
            <p class="conn-text">Conecte sua equipe via PIN ou QR Code. O primeiro a completar o código bloqueia o
                sistema dos demais. Cometa 3 erros e você será sumariamente <strong>eliminado</strong> da rede.</p>
        </div>
        <div class="conn-card">
            <p class="conn-num">03 / GEOPOLÍTICA</p>
            <p class="conn-title">O Tabuleiro Global</p>
            <p class="conn-text">O grid 9×9 é o cenário mundial. Cada bloco 3×3 é uma nação. Um número errado cria
                conflito em cascata em toda a linha e coluna — um colapso global de lógica.</p>
        </div>
        <div class="conn-card">
            <p class="conn-num">04 / PÉ DE COELHO</p>
            <p class="conn-title">A Peça que Falta</p>
            <p class="conn-text">A última célula em branco é a pendência do passado de Ethan. O Acerto Final é o
                preenchimento dos últimos espaços — a margem de erro é zero para não colapsar.</p>
        </div>
    </div>

    <div class="team-credits">
        <p class="team-title">// EQUIPE DE DESENVOLVIMENTO</p>
        <div class="team-members">
            <div class="member">Fernando Aguiar da Costa Morais</div>
            <div class="member">Claudia Marques da Silva</div>
            <div class="member">Marília Mesquita Pereira do Amaral</div>
        </div>
    </div>

</div>

<div id="game" class="screen">
    <div class="top-bar">
        <span class="top-bar-l">// SISTEMA ATIVO — ENTIDADE ONLINE</span>
        <span class="top-bar-r"><span class="sdot"></span> <span id="alive-count">TRANSMISSÃO AO VIVO</span></span>
    </div>

    <div class="hud">
        <div class="hud-cell"><span class="hud-lbl">Tempo</span><span class="hud-val" id="hud-time">10:00</span></div>
        <div class="hud-cell"><span class="hud-lbl">Erros</span><span class="hud-val" id="hud-errors">0 / 3</span></div>
        <div class="hud-cell"><span class="hud-lbl">Dicas</span><span class="hud-val" id="hud-hints">3</span></div>
        <div class="hud-cell"><span class="hud-lbl">Progresso</span><span class="hud-val" id="hud-prog">0%</span></div>
        <div class="hud-cell"><span class="hud-lbl">Nível</span><span class="hud-val" id="hud-diff"
                style="font-size:.75rem;letter-spacing:2px">—</span></div>
    </div>

    <div id="game-agents-panel">
        <p
            style="font-family:var(--mono); color:var(--cyan); font-size:0.75rem; font-weight:bold; letter-spacing:2px; margin-bottom:8px;">
            // STATUS DO PELOTÃO (BATTLE ROYALE)</p>
        <ul class="game-agent-list" id="game-agent-list"></ul>
    </div>

    <div class="ctrls">
        <button class="ctrl" id="btn-notes">📝 BENJI: OFF</button>
        <button class="ctrl" id="btn-hint">💡 DICA</button>
        <button class="ctrl dr" id="btn-new">↺ SAIR DA REDE</button>
    </div>

    <div class="arena">
        <div id="board"></div>
        <div class="numpad-col">
            <span class="np-lbl">Terminal</span>
            <div class="numpad" id="numpad">
                <button class="nb" data-n="1">1</button>
                <button class="nb" data-n="2">2</button>
                <button class="nb" data-n="3">3</button>
                <button class="nb" data-n="4">4</button>
                <button class="nb" data-n="5">5</button>
                <button class="nb" data-n="6">6</button>
                <button class="nb" data-n="7">7</button>
                <button class="nb" data-n="8">8</button>
                <button class="nb" data-n="9">9</button>
                <button class="nb erase" data-n="0">⌫ APAGAR</button>
            </div>
        </div>
    </div>

    <div id="status"></div>
</div>

<div id="cinematic">
    <p class="ci-logo">// Missão: Impossível — O Acerto Final</p>
    <div class="ci-lines" id="ci-lines"></div>
    <div id="ci-title"></div>
    <div class="ci-rule"></div>
    <div id="ci-sub"></div>
    <div id="ci-meta"></div>
    <button id="ci-restart">↺ SAIR DA REDE</button>
</div>

@endsection

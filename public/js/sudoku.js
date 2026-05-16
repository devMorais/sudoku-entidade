(() => {
    const G = { sol: null, puz: null, notes: null, sel: null, notesMode: false, timer: null, timeLeft: 600, errors: 0, maxErr: 5, hints: 3, diff: 'easy', gameOver: false, startTime: 0, filled: 0, total: 0 };
    const CLUES = { easy: 44, medium: 34, hard: 26 };
    const TIMES = { easy: 600, medium: 480, hard: 360 };

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playTone(type, freq, duration, vol) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
    }

    const SFX = {
        type: () => playTone('square', 800, 0.05, 0.03), error: () => playTone('sawtooth', 120, 0.3, 0.1),
        hint: () => { playTone('sine', 880, 0.1, 0.05); setTimeout(() => playTone('sine', 1760, 0.2, 0.05), 100); },
        win: () => { playTone('triangle', 440, 0.2, 0.1); setTimeout(() => playTone('triangle', 554, 0.2, 0.1), 200); setTimeout(() => playTone('triangle', 659, 0.6, 0.1), 400); },
        glitch: () => { let count = 0; let gl = setInterval(() => { playTone('sawtooth', Math.random() * 200 + 50, 0.1, 0.1); if (++count > 8) clearInterval(gl); }, 80); }
    };

    const echo = new (window.Echo || window.LaravelEcho)({
        broadcaster: 'pusher',
        key: '052bbd9c8da18fd4e3c9',
        cluster: 'sa1',
        forceTLS: true
    });

    G.multiplayer = false; G.roomPin = null; G.playerId = null; G.isLeader = false;

    document.getElementById('btn-understood').addEventListener('click', () => {
        document.getElementById('tutorial-screen').classList.remove('active');
        document.getElementById('intro').classList.add('active');
    });

    document.getElementById('qr-container').addEventListener('click', () => {
        document.getElementById('qr-modal-img').src = document.getElementById('qr-image').src;
        document.getElementById('qr-modal').style.display = 'flex';
    });
    document.getElementById('qr-modal').addEventListener('click', () => {
        document.getElementById('qr-modal').style.display = 'none';
    });

    const divInitial = document.getElementById('mp-initial-choices');
    const formJoin = document.getElementById('form-join');
    const formCreate = document.getElementById('form-create');

    document.getElementById('btn-intent-join').addEventListener('click', () => { divInitial.style.display = 'none'; formJoin.style.display = 'flex'; });
    document.getElementById('btn-intent-create').addEventListener('click', () => { divInitial.style.display = 'none'; formCreate.style.display = 'flex'; });
    document.querySelectorAll('.btn-back-menu').forEach(b => b.addEventListener('click', () => {
        formJoin.style.display = 'none'; formCreate.style.display = 'none'; divInitial.style.display = 'flex';
    }));

    window.onload = () => {
        const params = new URLSearchParams(window.location.search);
        if (params.has('pin')) {
            document.getElementById('tutorial-screen').classList.remove('active');
            document.getElementById('intro').classList.add('active');
            divInitial.style.display = 'none'; formJoin.style.display = 'flex';

            const pinInput = document.getElementById('join-pin');
            pinInput.value = params.get('pin'); pinInput.readOnly = true; pinInput.classList.add('locked');
            setStatus(`> PIN DETECTADO. INFORME SEU NOME PARA ENTRAR.`);
        }
    };

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = ~~(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }
    function genSol() {
        const g = Array.from({ length: 9 }, () => Array(9).fill(0));
        function ok(g, r, c, n) { for (let i = 0; i < 9; i++)if (g[r][i] === n || g[i][c] === n) return false; const br = ~~(r / 3) * 3, bc = ~~(c / 3) * 3; for (let i = 0; i < 3; i++)for (let j = 0; j < 3; j++)if (g[br + i][bc + j] === n) return false; return true }
        function fill(pos) { if (pos === 81) return true; const r = ~~(pos / 9), c = pos % 9; for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) { if (ok(g, r, c, n)) { g[r][c] = n; if (fill(pos + 1)) return true; g[r][c] = 0 } } return false }
        fill(0); return g;
    }
    function genPuz(sol, clues) {
        const p = sol.map(r => [...r]); const pos = shuffle(Array.from({ length: 81 }, (_, i) => i)); let rem = 0, need = 81 - clues;
        for (const i of pos) { if (rem >= need) break; const r = ~~(i / 9), c = i % 9, bak = p[r][c]; p[r][c] = 0; if (uniqueSol(p.map(x => [...x]))) rem++; else p[r][c] = bak } return p;
    }
    function uniqueSol(g) {
        let cnt = 0;
        function ok(g, r, c, n) { for (let i = 0; i < 9; i++)if (g[r][i] === n || g[i][c] === n) return false; const br = ~~(r / 3) * 3, bc = ~~(c / 3) * 3; for (let i = 0; i < 3; i++)for (let j = 0; j < 3; j++)if (g[br + i][bc + j] === n) return false; return true }
        function solve(g) { if (cnt > 1) return; let best = 10, br = -1, bc = -1; for (let r = 0; r < 9; r++)for (let c = 0; c < 9; c++) { if (!g[r][c]) { let o = 0; for (let n = 1; n <= 9; n++)if (ok(g, r, c, n)) o++; if (!o) return; if (o < best) { best = o; br = r; bc = c } } } if (br === -1) { cnt++; return } for (let n = 1; n <= 9; n++)if (ok(g, br, bc, n)) { g[br][bc] = n; solve(g); g[br][bc] = 0 } }
        solve(g); return cnt === 1;
    }
    function blk(r, c) { return ~~(r / 3) * 3 + ~~(c / 3) }

    function startGame() {
        if (!G.multiplayer) {
            setStatus('> Gerando matriz de missão local...');
            G.sol = genSol(); G.puz = genPuz(G.sol, CLUES[G.diff]); G.timeLeft = TIMES[G.diff];
        } else {
            G.timeLeft = 600;
            document.getElementById('game-agents-panel').style.display = 'block';
        }
        G.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
        G.sel = null; G.notesMode = false; G.errors = 0; G.hints = 3; G.gameOver = false;
        G.startTime = Date.now(); G.total = G.puz.flat().filter(v => !v).length; G.filled = 0;
        clearInterval(G.timer);

        document.getElementById('hud-errors').textContent = '0 / ' + G.maxErr; document.getElementById('hud-errors').className = 'hud-val';
        document.getElementById('hud-hints').textContent = '3'; document.getElementById('hud-prog').textContent = '0%';
        document.getElementById('hud-time').className = 'hud-val';
        document.getElementById('btn-notes').textContent = '📝 BENJI: OFF'; document.getElementById('btn-notes').classList.remove('on');
        document.getElementById('cinematic').className = '';

        document.getElementById('hud-diff').textContent = G.multiplayer ? 'BATALHA' : { easy: 'FÁCIL', medium: 'MÉDIO', hard: 'DIFÍCIL' }[G.diff];
        setStatus(G.multiplayer ? '🎮 BATALHA REAL ATIVA — SOBREVIVA À ENTIDADE' : '');
        renderBoard(); startTimer();
    }

    function renderBoard() {
        const board = document.getElementById('board'); board.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div'); cell.className = 'cell'; cell.dataset.r = r; cell.dataset.c = c; cell.dataset.block = blk(r, c); cell.dataset.col = c; cell.dataset.row = r;
                const mv = document.createElement('div'); mv.className = 'mv'; const ng = document.createElement('div'); ng.className = 'ng';
                for (let n = 1; n <= 9; n++) { const ni = document.createElement('div'); ni.className = 'nn'; ni.dataset.n = n; ng.appendChild(ni) }
                if (G.puz[r][c]) { mv.textContent = G.puz[r][c]; cell.classList.add('fixed') } else cell.addEventListener('click', () => selectCell(r, c));
                cell.appendChild(ng); cell.appendChild(mv); board.appendChild(cell);
            }
        }
    }

    function selectCell(r, c) { if (G.gameOver) return; G.sel = { r, c }; applyHL(r, c); }
    function applyHL(r, c) {
        const sv = G.puz[r][c], sb = blk(r, c);
        document.querySelectorAll('.cell').forEach(el => {
            el.classList.remove('selected', 'hl-block', 'hl-line', 'same-num', 'error');
            const er = +el.dataset.r, ec = +el.dataset.c;
            if (er === r && ec === c) { el.classList.add('selected'); return }
            if (blk(er, ec) === sb) el.classList.add('hl-block'); else if (er === r || ec === c) el.classList.add('hl-line');
            if (sv && G.puz[er][ec] === sv) el.classList.add('same-num');
        });
        restoreErr();
    }

    function restoreErr() {
        document.querySelectorAll('.cell').forEach(el => {
            const r = +el.dataset.r, c = +el.dataset.c;
            if (G.puz[r][c] && G.puz[r][c] !== G.sol[r][c]) el.classList.add('error');
        });
    }

    window.triggerOpponentWin = function (winnerName) {
        SFX.glitch(); G.gameOver = true; clearInterval(G.timer);
        document.getElementById('cinematic').className = 'show lose';
        document.getElementById('ci-title').textContent = 'MISSÃO ABORTADA';
        document.getElementById('ci-sub').innerHTML = 'O AGENTE <strong style="color:#fff">' + winnerName.toUpperCase() + '</strong> QUEBROU AS CHAVES DA ENTIDADE PRIMEIRO.<br><span style="color:var(--gold);font-size:.68rem">// O Battle Royale terminou.</span>';
        document.getElementById('ci-meta').textContent = '> Status da Sala: Invasão Fechada';
        animLines(['> ACESSO INTERROMPIDO...', '> OUTRO TERMINAL VENCEU A CORRIDA', '> FECHANDO BACKDOOR...']);
    };

    function input(n) {
        if (!G.sel || G.gameOver) return; const { r, c } = G.sel;
        if (G.puz[r][c] && G.puz[r][c] === G.sol[r][c]) return;
        const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell || cell.classList.contains('fixed')) return;

        if (n === 0) {
            SFX.type(); const wasOk = G.puz[r][c] === G.sol[r][c] && G.puz[r][c];
            G.puz[r][c] = 0; G.notes[r][c].clear(); cell.querySelector('.mv').textContent = '';
            cell.querySelectorAll('.nn').forEach(x => { x.textContent = ''; x.classList.remove('on') });
            cell.classList.remove('error'); if (wasOk) { G.filled = Math.max(0, G.filled - 1); updProg() } setStatus(''); return;
        }
        if (G.notesMode) {
            SFX.type(); if (G.puz[r][c]) return;
            if (G.notes[r][c].has(n)) G.notes[r][c].delete(n); else G.notes[r][c].add(n);
            const ni = cell.querySelector(`.nn[data-n="${n}"]`);
            if (G.notes[r][c].has(n)) { ni.textContent = n; ni.classList.add('on') } else { ni.textContent = ''; ni.classList.remove('on') }
            cell.querySelector('.mv').textContent = ''; return;
        }
        G.notes[r][c].clear(); cell.querySelectorAll('.nn').forEach(x => { x.textContent = ''; x.classList.remove('on') });

        if (n === G.sol[r][c]) {
            SFX.type(); const wasEmpty = !G.puz[r][c]; G.puz[r][c] = n; cell.querySelector('.mv').textContent = n; cell.classList.remove('error');
            if (wasEmpty) { G.filled++; updProg() } setStatus(''); applyHL(r, c); checkWin();
        } else {
            SFX.error(); G.errors++; const left = G.maxErr - G.errors;
            document.getElementById('hud-errors').textContent = G.errors + ' / ' + G.maxErr;
            if (G.errors >= G.maxErr) document.getElementById('hud-errors').className = 'hud-val danger'; else document.getElementById('hud-errors').className = 'hud-val warn';
            cell.querySelector('.mv').textContent = n; cell.classList.add('error'); G.puz[r][c] = n;
            setStatus('⚠ ERRO DETECTADO — ' + left + ' tentativa' + (left !== 1 ? 's' : '') + ' restante' + (left !== 1 ? 's' : ''));
            if (G.errors >= G.maxErr) triggerLose();
        }
    }

    function updProg() { const pct = G.total > 0 ? Math.round(G.filled / G.total * 100) : 0; document.getElementById('hud-prog').textContent = pct + '%'; }

    function checkWin() {
        for (let r = 0; r < 9; r++)for (let c = 0; c < 9; c++)if (G.puz[r][c] !== G.sol[r][c]) return;
        clearInterval(G.timer); G.gameOver = true;
        if (G.multiplayer) { fetch(`/api/rooms/${G.roomPin}/victory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: G.playerId }) }); }
        else { setTimeout(triggerWin, 400); }
    }

    function setStatus(m) {
        const iS = document.getElementById('status-intro'); const gS = document.getElementById('status');
        if (iS) iS.textContent = m; if (gS) gS.textContent = m;
    }

    function startTimer() {
        // Captura a duração total da partida com base no modo
        const totalDuration = G.multiplayer ? 600 : TIMES[G.diff];

        // Força a atualização imediata na tela
        updTimer();

        G.timer = setInterval(() => {
            // Calcula os segundos reais que se passaram desde o startTime (imune ao navegador dormir)
            const elapsedSeconds = Math.floor((Date.now() - G.startTime) / 1000);

            // Define o tempo restante real
            G.timeLeft = totalDuration - elapsedSeconds;

            // Se o tempo esgotar, trava no zero para não dar negativo
            if (G.timeLeft < 0) G.timeLeft = 0;

            updTimer();

            // Controle das cores de alerta
            if (G.timeLeft <= 60 && G.timeLeft > 0) {
                document.getElementById('hud-time').className = 'hud-val danger';
            } else if (G.timeLeft <= 120 && G.timeLeft > 60) {
                document.getElementById('hud-time').className = 'hud-val warn';
            }

            // Fim de jogo pelo tempo
            if (G.timeLeft <= 0) {
                clearInterval(G.timer);
                triggerLose();
            }
        }, 1000); // O setInterval agora serve apenas para atualizar a tela, não para contar a matemática
    }

    function updTimer() {
        let t = parseInt(G.timeLeft); if (isNaN(t) || t == null) t = 600;
        const m = Math.floor(t / 60); const s = t % 60;
        document.getElementById('hud-time').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function useHint() {
        if (G.hints <= 0 || G.gameOver) return; const empties = [];
        for (let r = 0; r < 9; r++)for (let c = 0; c < 9; c++)if (G.puz[r][c] !== G.sol[r][c]) empties.push({ r, c });
        if (!empties.length) return; const { r, c } = empties[~~(Math.random() * empties.length)]; const wasEmpty = !G.puz[r][c];
        G.puz[r][c] = G.sol[r][c]; G.notes[r][c].clear();
        const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
        cell.querySelector('.mv').textContent = G.sol[r][c]; cell.querySelectorAll('.nn').forEach(x => { x.textContent = ''; x.classList.remove('on') });
        cell.classList.remove('error'); cell.classList.add('hint-ok'); setTimeout(() => cell.classList.remove('hint-ok'), 800);
        if (wasEmpty) { G.filled++; updProg() } SFX.hint(); G.hints--; document.getElementById('hud-hints').textContent = G.hints;
        setStatus('> Dica aplicada — código descriptografado'); checkWin();
    }

    function elapsed() { const s = ~~((Date.now() - G.startTime) / 1000); return String(~~(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') }

    function triggerWin() {
        SFX.win(); G.gameOver = true; document.getElementById('cinematic').className = 'show win';
        document.getElementById('ci-title').textContent = 'ENTIDADE DESTRUÍDA';
        document.getElementById('ci-sub').innerHTML = 'CÓDIGO-FONTE SOBRESCRITO. VOCÊ VENCEU O BATTLE ROYALE.<br><span style="color:var(--cyan);font-size:.68rem">// O imprevisível humano derrotou a lógica.</span>';
        document.getElementById('ci-meta').textContent = '> Tempo: ' + elapsed() + ' | Erros: ' + G.errors + '/' + G.maxErr;
        animLines(['> ANALISANDO PADRÃO HUMANO...', '> FIREWALL DA ENTIDADE: QUEBRADO', '> VITÓRIA GERAL CONCEDIDA ✓']);
    }

    function triggerLose() {
        SFX.glitch(); G.gameOver = true; clearInterval(G.timer);
        if (G.multiplayer) {
            fetch(`/api/rooms/${G.roomPin}/eliminate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: G.playerId })
            });
        }

        document.getElementById('cinematic').className = 'show lose';
        document.getElementById('ci-title').textContent = 'SISTEMA COLAPSADO';
        document.getElementById('ci-sub').innerHTML = 'A ENTIDADE PREVIU CADA VARIÁVEL. VOCÊ FOI ELIMINADO DA REDE.<br><span style="color:var(--red);font-size:.68rem">// Aguarde o desfecho da equipe ou saia da missão.</span>';
        document.getElementById('ci-meta').textContent = '> Erros Críticos: ' + G.errors + '/' + G.maxErr;
        animLines(['> ESCANEANDO PADRÃO...', '> MARGEM DE ERRO: ZERO', '> ACESSO REVOGADO. ELIMINAÇÃO CONFIRMADA ✗']);

        if (G.multiplayer) {
            let btnSpec = document.getElementById('btn-spectate');
            if (!btnSpec) {
                btnSpec = document.createElement('button');
                btnSpec.id = 'btn-spectate';
                btnSpec.className = 'ctrl';
                btnSpec.style.cssText = 'border-color:var(--cyan);color:var(--cyan);margin-top:10px;font-size:.85rem;padding:.7rem 1.8rem';
                btnSpec.innerHTML = '👁 ACOMPANHAR PELOTÃO';
                btnSpec.onclick = () => {
                    document.getElementById('cinematic').classList.remove('show');
                    // Deixa tabuleiro visível mas travado — só leitura
                    document.querySelectorAll('.cell:not(.fixed)').forEach(cell => {
                        cell.style.pointerEvents = 'none';
                        cell.style.opacity = '0.5';
                    });
                    // Barra de espectador no topo do jogo
                    const spectatorBar = document.createElement('div');
                    spectatorBar.style.cssText = 'width:100%;max-width:830px;background:rgba(230,57,70,.1);border:1px solid var(--red);border-radius:6px;padding:.5rem 1rem;font-family:var(--mono);font-size:.7rem;color:var(--red);letter-spacing:2px;text-align:center;animation:blink .8s infinite';
                    spectatorBar.textContent = '⚠ MODO ESPECTADOR — VOCÊ FOI ELIMINADO — ACOMPANHANDO O PELOTÃO';
                    const gameEl = document.getElementById('game');
                    gameEl.insertBefore(spectatorBar, gameEl.firstChild);
                    setStatus('> Transmissão ativa — aguardando desfecho da missão...');
                };
                document.getElementById('ci-restart').parentNode.appendChild(btnSpec);
            }
            btnSpec.style.display = 'inline-block';
        }
    }

    function animLines(lines) {
        const el = document.getElementById('ci-lines'); el.textContent = ''; let i = 0;
        function nx() { if (i >= lines.length) return; el.textContent += lines[i] + '\n'; i++; setTimeout(nx, 380) } nx();
    }

    window.renderLobbyAgent = function (name, id) {
        const ulLobby = document.getElementById('agent-list');
        if (ulLobby && !document.getElementById('agent-' + id)) {
            const li = document.createElement('li'); li.className = 'agent-item'; li.id = 'agent-' + id;
            li.textContent = name.toUpperCase(); ulLobby.appendChild(li);
        }
        const ulGame = document.getElementById('game-agent-list');
        if (ulGame && !document.getElementById('g-agent-' + id)) {
            const gli = document.createElement('li'); gli.className = 'g-agent'; gli.id = 'g-agent-' + id;
            gli.textContent = name.toUpperCase(); ulGame.appendChild(gli);
        }
    };

    window.markAgentEliminated = function (id) {
        const li = document.getElementById('agent-' + id); if (li) li.classList.add('eliminated');
        const gli = document.getElementById('g-agent-' + id); if (gli) gli.classList.add('eliminated');
    };

    function subscribeToRoom(pin) {
        echo.channel(`room.${pin}`)
            .listen('.PlayerJoined', (e) => { // <-- Adicionado o ponto aqui
                SFX.hint(); renderLobbyAgent(e.playerName, e.playerId);
                setStatus(`> Agente ${e.playerName.toUpperCase()} interceptou o PIN.`);
            })
            .listen('.PlayerEliminated', (e) => { // <-- Adicionado o ponto aqui
                SFX.error(); let agentName = "DESCONHECIDO";
                const domEl = document.getElementById('agent-' + e.playerId);
                if (domEl) agentName = domEl.textContent.replace('[ CONECTADO ]', '').replace('[ ABATIDO ]', '').trim();
                markAgentEliminated(e.playerId);
                setStatus(`⚠ ALERTA GLOBAL: Agente ${agentName} foi trancado fora do sistema.`);
            })
            .listen('.GameStarted', (e) => { // <-- Adicionado o ponto aqui
                G.sol = e.room.solution; G.puz = e.room.puzzle;
                document.getElementById('intro').classList.remove('active');
                document.getElementById('game').classList.add('active'); startGame();
            })
            .listen('.MissionAccomplished', (e) => { // <-- Adicionado o ponto aqui
                if (e.room.winner_id === G.playerId) triggerWin();
                else triggerOpponentWin(e.winnerName);
            });
    }

    document.getElementById('btn-start').addEventListener('click', () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        if (G.multiplayer && G.isLeader) {
            setStatus('> Deflagrando sinal síncrono...');
            fetch(`/api/rooms/${G.roomPin}/start`, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        G.sol = data.solution;
                        G.puz = data.puzzle;
                        document.getElementById('intro').classList.remove('active');
                        document.getElementById('game').classList.add('active');
                        startGame();
                    }
                })
                .catch(() => setStatus('Erro ao iniciar a missão.'));
            return;
        }
        G.multiplayer = false;
        document.getElementById('intro').classList.remove('active');
        document.getElementById('game').classList.add('active');
        startGame();
    });

    document.getElementById('btn-do-create').addEventListener('click', async () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const name = document.getElementById('create-name').value.trim();
        if (!name) { setStatus('⚠ CODNOME EXIGIDO para gerar o link tático.'); return; }

        setStatus('> Gerando matriz criptográfica aleatória...');

        // 1. O Líder gera um jogo 100% novo e aleatório no próprio PC
        const novaSolucao = genSol();
        const novoPuzzle = genPuz(novaSolucao, CLUES[G.diff]);

        setStatus('> Solicitando tunelamento de chaves HTTP...');
        try {
            // 2. O Líder envia o jogo gerado para o Laravel salvar no banco de dados da sala
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    solution: novaSolucao,
                    puzzle: novoPuzzle,
                    diff: G.diff // Opcional, envia a dificuldade escolhida
                })
            }).then(r => r.json());

            if (res.success) {
                const pin = res.pin;

                // Oculta e exibe elementos da interface
                document.getElementById('diff-select').style.display = 'none';
                document.getElementById('lbl-solo').textContent = '// ACESSO REMOTO (QR CODE)';
                document.getElementById('qr-container').style.display = 'flex';
                document.getElementById('qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=svg&data=${encodeURIComponent(window.location.origin + '?pin=' + pin)}`;

                document.getElementById('form-create').style.display = 'none';
                document.getElementById('lobby-view').style.display = 'flex';
                document.getElementById('lobby-pin-display').textContent = pin;
                document.getElementById('lbl-rede').textContent = '// PELOTÃO EM FORMAÇÃO';

                // Faz o Join do Líder na própria sala
                const joinRes = await fetch('/api/rooms/join', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ pin: pin, name: name }) }).then(r => r.json());

                if (joinRes.success) {
                    G.multiplayer = true; G.roomPin = pin; G.playerId = joinRes.player_id; G.isLeader = true;

                    if (joinRes.players) {
                        joinRes.players.forEach(p => renderLobbyAgent(p.name, p.id));
                    } else {
                        renderLobbyAgent(name, joinRes.player_id);
                    }

                    setStatus(`SALA [${pin}] ATIVA!`);
                    subscribeToRoom(pin);

                    const startBtn = document.getElementById('btn-start');
                    startBtn.textContent = `▶ INICIAR BATTLE ROYALE`;
                    startBtn.style.background = 'var(--green)';
                    startBtn.style.boxShadow = '0 0 45px rgba(0, 255, 136, .45)';
                }
            }
        } catch (e) {
            setStatus('⚠ ERRO DE TUNELAMENTO INTERNO.');
        }
    });

    document.getElementById('btn-do-join').addEventListener('click', async () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const name = document.getElementById('join-name').value.trim();
        const pin = document.getElementById('join-pin').value.trim();
        if (!name || !pin) { setStatus('⚠ Informe seu Codinome e o PIN da Sala.'); return; }

        setStatus('> Validando credenciais nos nós centrais...');
        try {
            const res = await fetch('/api/rooms/join', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ pin, name }) }).then(r => r.json());
            if (res.success) {
                G.multiplayer = true; G.roomPin = pin; G.playerId = res.player_id; G.isLeader = res.is_leader;

                document.getElementById('diff-select').style.display = 'none';
                document.getElementById('lbl-solo').textContent = '// STATUS DA INFILTRAÇÃO';
                document.getElementById('btn-start').style.display = 'none';

                document.getElementById('form-join').style.display = 'none';
                document.getElementById('lobby-view').style.display = 'flex';
                document.getElementById('lobby-pin-display').textContent = pin;
                document.getElementById('lbl-rede').textContent = '// PELOTÃO EM FORMAÇÃO';

                if (res.players) { res.players.forEach(p => renderLobbyAgent(p.name, p.id)); } else { renderLobbyAgent(name, res.player_id); }
                setStatus(`> AGENTE AUTENTICADO! Aguardando o Líder disparar o sinal...`); subscribeToRoom(pin);
            } else { setStatus(`⚠ FALHA DE ENTRADA: PIN Inválido ou sala fechada.`); }
        } catch (e) { setStatus('⚠ ERRO DE COMUNICAÇÃO.'); }
    });

    document.querySelectorAll('.diff-btn').forEach(b => { b.addEventListener('click', () => { if (audioCtx.state === 'suspended') audioCtx.resume(); document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); G.diff = b.dataset.d }); });
    document.getElementById('btn-notes').addEventListener('click', () => { G.notesMode = !G.notesMode; const btn = document.getElementById('btn-notes'); btn.textContent = '📝 BENJI: ' + (G.notesMode ? 'ON' : 'OFF'); btn.classList.toggle('on', G.notesMode); });
    document.getElementById('btn-hint').addEventListener('click', useHint);
    document.getElementById('btn-new').addEventListener('click', () => { window.location.reload(); });
    document.querySelectorAll('.nb').forEach(b => b.addEventListener('click', () => input(+b.dataset.n)));
    document.getElementById('ci-restart').addEventListener('click', () => { window.location.reload(); });
    document.addEventListener('keydown', e => {
        if (!G.sel || G.gameOver) return; const { r, c } = G.sel;
        if (e.key >= '1' && e.key <= '9') { e.preventDefault(); input(+e.key) }
        else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); input(0) }
        else if (e.key === 'ArrowUp' && r > 0) { e.preventDefault(); selectCell(r - 1, c) }
        else if (e.key === 'ArrowDown' && r < 8) { e.preventDefault(); selectCell(r + 1, c) }
        else if (e.key === 'ArrowLeft' && c > 0) { e.preventDefault(); selectCell(r, c - 1) }
        else if (e.key === 'ArrowRight' && c < 8) { e.preventDefault(); selectCell(r, c + 1) }
        else if (e.key === 'n' || e.key === 'N') document.getElementById('btn-notes').click();
    });
})();

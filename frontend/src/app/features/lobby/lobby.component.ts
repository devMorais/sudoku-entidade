import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameApiService } from '../../core/services/game-api.service';
import { GameStateService } from '../../core/services/game-state.service';
import { SudokuService } from '../../core/services/sudoku.service';
import { WebSocketService, PlayerJoinedPayload, GameStartedPayload, LeaderChangedPayload, PlayerLeftPayload } from '../../core/services/websocket.service';
import { Difficulty } from '../../core/models/room.model';
import { Player } from '../../core/models/player.model';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent implements OnInit, OnDestroy {

  private api    = inject(GameApiService);
  private gs     = inject(GameStateService);
  private sudoku = inject(SudokuService);
  private ws     = inject(WebSocketService);
  private router = inject(Router);

  mode       = signal<'select' | 'solo' | 'create' | 'join' | 'waiting'>('select');
  playerName = '';
  joinPin    = '';
  difficulty: Difficulty = 'medium';

  roomPin  = signal('');
  isLeader = signal(false);
  players  = signal<Partial<Player>[]>([]);
  loading  = signal(false);
  errorMsg = signal('');

  // puzzle gerado pelo líder — guardado para iniciar o jogo
  private leaderPuzzle:   number[][] = [];
  private leaderSolution: number[][] = [];

  private sub?: Subscription;

  ngOnInit(): void {
    // restaura preferências salvas
    const prefs = localStorage.getItem('sudoku_prefs');
    if (prefs) {
      try {
        const p = JSON.parse(prefs);
        this.playerName = p.name ?? '';
        this.difficulty = p.diff ?? 'medium';
      } catch { /* ignora */ }
    }

    // lê ?pin=XXXX da URL para pré-preencher
    const params = new URLSearchParams(window.location.search);
    const pin = params.get('pin');
    if (pin) { this.joinPin = pin; this.mode.set('join'); }

    this.sub = this.ws.events$.subscribe(evt => this.handleWsEvent(evt.type, evt.payload));
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  selectMode(m: 'solo' | 'create' | 'join'): void {
    this.mode.set(m);
    this.errorMsg.set('');
  }

  // ── Solo: gera puzzle localmente e vai direto ao jogo ─────────────────────
  startSolo(): void {
    this.savePrefs();
    this.gs.startNewGame(this.difficulty);
    this.router.navigate(['/game']);
  }

  // ── Criar sala: gera puzzle, envia ao servidor, espera jogadores ──────────
  createRoom(): void {
    if (!this.playerName.trim()) { this.errorMsg.set('Informe seu codinome de agente.'); return; }
    this.savePrefs();
    this.loading.set(true);
    this.errorMsg.set('');

    // gera puzzle + solução localmente antes de criar a sala
    const solution = this.sudoku.generateSolution();
    const puzzle   = this.sudoku.generatePuzzle(solution, this.difficulty);

    this.leaderPuzzle   = puzzle;
    this.leaderSolution = solution;

    this.api.createRoom(this.playerName.trim(), puzzle, solution).subscribe({
      next: res => {
        this.loading.set(false);
        if (!res.success || !res.data) { this.errorMsg.set(res.message || 'Erro ao criar sala.'); return; }

        const { room, player } = res.data;
        this.roomPin.set(room.pin);
        this.isLeader.set(true);
        this.players.set([{ id: player.id, name: player.name, is_leader: true }]);

        this.gs.setMultiplayerContext(room.pin, player.id, true, player.name);
        this.ws.connect();
        this.ws.subscribeToRoom(room.pin);
        this.mode.set('waiting');
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao criar sala. Verifique a conexão.';
        this.errorMsg.set(msg);
      },
    });
  }

  // ── Entrar na sala ────────────────────────────────────────────────────────
  joinRoom(): void {
    if (!this.playerName.trim()) { this.errorMsg.set('Informe seu codinome de agente.'); return; }
    if (!this.joinPin.trim())    { this.errorMsg.set('Informe o código de acesso (PIN).'); return; }
    this.savePrefs();
    this.loading.set(true);
    this.errorMsg.set('');

    this.api.joinRoom(this.joinPin.trim(), this.playerName.trim()).subscribe({
      next: res => {
        this.loading.set(false);
        if (!res.success || !res.data) { this.errorMsg.set(res.message || 'PIN inválido.'); return; }

        const { player } = res.data;
        this.roomPin.set(this.joinPin.trim());
        this.isLeader.set(player.is_leader);
        this.players.update(list => {
          const exists = list.some(p => p.id === player.id);
          return exists ? list : [...list, { id: player.id, name: player.name, is_leader: player.is_leader }];
        });

        this.gs.setMultiplayerContext(this.joinPin.trim(), player.id, player.is_leader, player.name);
        this.ws.connect();
        this.ws.subscribeToRoom(this.joinPin.trim());
        this.mode.set('waiting');
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'PIN inválido ou sala não encontrada.';
        this.errorMsg.set(msg);
      },
    });
  }

  // ── Líder inicia o jogo ───────────────────────────────────────────────────
  startGame(): void {
    const s = this.gs.state();
    if (!s.isLeader || !s.playerId) return;
    this.loading.set(true);
    this.errorMsg.set('');

    this.api.startGame(s.roomPin, s.playerId).subscribe({
      next: res => {
        this.loading.set(false);
        if (!res.success) { this.errorMsg.set(res.message || 'Erro ao iniciar.'); return; }
        // líder já tem puzzle gerado localmente
        this.gs.startFromPuzzle(this.leaderPuzzle, this.leaderSolution, this.difficulty);
        this.router.navigate(['/game']);
      },
      error: () => { this.loading.set(false); this.errorMsg.set('Erro ao iniciar o protocolo.'); },
    });
  }

  copyInviteLink(): void {
    const url = `${window.location.origin}?pin=${this.roomPin()}`;
    navigator.clipboard?.writeText(url).catch(() => {
      // fallback para browsers sem clipboard API
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
  }

  // ── Eventos WebSocket ─────────────────────────────────────────────────────
  private handleWsEvent(type: string, payload: unknown): void {
    switch (type) {
      case 'PlayerJoined': {
        const p = payload as PlayerJoinedPayload;
        this.players.update(list => {
          const exists = list.some(x => x.id === p.playerId);
          return exists ? list : [...list, { id: p.playerId, name: p.playerName, is_leader: false }];
        });
        break;
      }

      case 'PlayerLeft': {
        const p = payload as PlayerLeftPayload;
        this.players.update(list => list.filter(x => x.id !== p.playerId));
        break;
      }

      case 'GameStarted': {
        // não-líderes recebem puzzle+solution aqui e vão para o jogo
        if (!this.isLeader()) {
          const p = payload as GameStartedPayload & { solution?: number[][] };
          if (p.puzzle && p.solution) {
            this.gs.startFromPuzzle(p.puzzle, p.solution, this.difficulty);
          }
          this.router.navigate(['/game']);
        }
        break;
      }

      case 'LeaderChanged': {
        const p = payload as { newLeaderId: number; newLeaderName: string };
        const myId = this.gs.state().playerId;
        if (p.newLeaderId === myId) {
          this.isLeader.set(true);
          this.gs.setMultiplayerContext(this.roomPin(), myId!, true, this.playerName);
        }
        this.players.update(list => list.map(x => ({ ...x, is_leader: x.id === p.newLeaderId })));
        break;
      }
    }
  }

  private savePrefs(): void {
    try {
      localStorage.setItem('sudoku_prefs', JSON.stringify({ name: this.playerName, diff: this.difficulty }));
    } catch { /* ignora */ }
  }
}

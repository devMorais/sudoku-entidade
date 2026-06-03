import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QrcodeComponent } from '../../shared/components/qrcode/qrcode.component';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameApiService } from '../../core/services/game-api.service';
import { GameStateService } from '../../core/services/game-state.service';
import { SudokuService } from '../../core/services/sudoku.service';
import {
  WebSocketService,
  PlayerJoinedPayload,
  GameStartedPayload,
  LeaderChangedPayload,
  PlayerLeftPayload,
} from '../../core/services/websocket.service';
import { Difficulty } from '../../core/models/room.model';
import { Player } from '../../core/models/player.model';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [FormsModule, QrcodeComponent],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent implements OnInit, OnDestroy {
  private api    = inject(GameApiService);
  private gs     = inject(GameStateService);
  private sudoku = inject(SudokuService);
  private ws     = inject(WebSocketService);
  private router = inject(Router);

  mode       = signal<'select' | 'solo' | 'create' | 'join' | 'waiting' | string>('select');
  playerName = '';
  joinPin    = '';
  difficulty: Difficulty = 'medium';

  roomPin    = signal('');
  isLeader   = signal(false);
  players    = signal<Partial<Player>[]>([]);
  loading    = signal(false);
  errorMsg   = signal('');

  // detecta se veio de link de convite (?pin=XXXX)
  hasInvitePin = signal(false);
  savedName    = '';

  private leaderPuzzle:   number[][] = [];
  private leaderSolution: number[][] = [];
  private sub?: Subscription;

  ngOnInit(): void {
    // carrega prefs salvas
    try {
      const prefs = JSON.parse(localStorage.getItem('sudoku_prefs') || '{}');
      this.playerName = prefs.name ?? '';
      this.savedName  = prefs.name ?? '';
      this.difficulty = prefs.diff ?? 'medium';
    } catch { /* ignora */ }

    // verifica ?pin=XXXX na URL
    const params = new URLSearchParams(window.location.search);
    const pin = params.get('pin');
    if (pin) {
      this.joinPin = pin;
      this.hasInvitePin.set(true);
      this.mode.set('join');
      // remove o pin da URL sem recarregar
      window.history.replaceState({}, '', window.location.pathname);
    }

    this.sub = this.ws.events$.subscribe(evt => this.handleWsEvent(evt.type, evt.payload));
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  selectMode(m: string): void {
    this.mode.set(m);
    this.errorMsg.set('');
    this.hasInvitePin.set(false);
  }

  // ── Solo ─────────────────────────────────────────────────────────────────
  startSolo(): void {
    this.savePrefs();
    this.gs.startNewGame(this.difficulty);
    this.router.navigate(['/game']);
  }

  // ── Criar sala ───────────────────────────────────────────────────────────
  createRoom(): void {
    if (!this.playerName.trim()) { this.errorMsg.set('Informe seu codinome de agente.'); return; }
    this.savePrefs();
    this.loading.set(true);
    this.errorMsg.set('');

    const solution = this.sudoku.generateSolution();
    const puzzle   = this.sudoku.generatePuzzle(solution, this.difficulty);
    this.leaderPuzzle   = puzzle;
    this.leaderSolution = solution;

    this.api.createRoom(this.playerName.trim(), this.difficulty, puzzle, solution).subscribe({
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
        this.errorMsg.set(err?.error?.message ?? 'Erro ao criar sala. Verifique a conexão.');
      },
    });
  }

  // ── Entrar na sala ───────────────────────────────────────────────────────
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
        const pin = this.joinPin.trim();
        this.roomPin.set(pin);
        this.isLeader.set(player.is_leader);

        // adiciona o próprio jogador primeiro
        this.players.set([{ id: player.id, name: player.name, is_leader: player.is_leader }]);

        this.gs.setMultiplayerContext(pin, player.id, player.is_leader, player.name);
        this.ws.connect();
        this.ws.subscribeToRoom(pin);
        this.mode.set('waiting');

        // busca jogadores que já estavam na sala antes de entrar
        this.loadExistingPlayers(pin, player.id);
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'PIN inválido ou sala não encontrada.');
      },
    });
  }

  // busca estado atual da sala para mostrar jogadores já presentes
  private loadExistingPlayers(pin: string, myId: number): void {
    this.api.getRoomState(pin, myId).subscribe({
      next: res => {
        if (!res.success || !res.data) return;
        const existing = (res.data.players ?? []).map((p: any) => ({
          id:        p.id,
          name:      p.name,
          is_leader: p.is_leader,
        }));
        // merge sem duplicatas
        this.players.set(
          existing.filter((p: any, i: number, arr: any[]) =>
            arr.findIndex((x: any) => x.id === p.id) === i
          )
        );
      },
      error: () => { /* falha silenciosa — lista parcial ainda funciona */ },
    });
  }

  // ── Iniciar jogo (líder) ─────────────────────────────────────────────────
  startGame(): void {
    const s = this.gs.state();
    if (!s.isLeader || !s.playerId) return;
    this.loading.set(true);
    this.errorMsg.set('');

    this.api.startGame(s.roomPin, s.playerId).subscribe({
      next: res => {
        this.loading.set(false);
        if (!res.success) { this.errorMsg.set(res.message || 'Erro ao iniciar.'); return; }
        this.gs.startFromPuzzle(this.leaderPuzzle, this.leaderSolution, this.difficulty);
        this.router.navigate(['/game']);
      },
      error: () => { this.loading.set(false); this.errorMsg.set('Erro ao ativar o protocolo.'); },
    });
  }

  // ── Sair da sala (botão abandonar) ──────────────────────────────────────
  leaveRoom(): void {
    const s = this.gs.state();
    if (s.playerId && this.roomPin()) {
      this.ws.leaveRoom(this.roomPin());
      this.api.leaveRoom(this.roomPin(), s.playerId).subscribe();
    }
    this.ws.disconnect();
    this.players.set([]);
    this.roomPin.set('');
    this.isLeader.set(false);
    this.mode.set('select');
  }

  get inviteLink(): string {
    return this.roomPin() ? `${window.location.origin}/lobby?pin=${this.roomPin()}` : '';
  }

  copyInviteLink(): void {
    const url = `${window.location.origin}/lobby?pin=${this.roomPin()}`;
    navigator.clipboard?.writeText(url).catch(() => {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
  }

  // ── Eventos WebSocket ────────────────────────────────────────────────────
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
        if (!this.isLeader()) {
          const p = payload as GameStartedPayload;
          if (p.puzzle && p.solution) {
            const diff = (p.difficulty as Difficulty) ?? 'medium';
            this.gs.startFromPuzzle(p.puzzle, p.solution, diff);
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

import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameStateService } from '../../core/services/game-state.service';
import { GameApiService } from '../../core/services/game-api.service';
import { WebSocketService, PlayerMovedPayload, PlayerEliminatedPayload, MissionAccomplishedPayload } from '../../core/services/websocket.service';

export interface SpectatorPlayer {
  id: number;
  name: string;
  errors: number;
  filled: number;
  total: number;
  board: number[][];
  isEliminated: boolean;
  isWinner: boolean;
}

@Component({
  selector: 'app-spectate',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './spectate.component.html',
  styleUrls: ['./spectate.component.scss'],
})
export class SpectateComponent implements OnInit, OnDestroy {
  private gs     = inject(GameStateService);
  private api    = inject(GameApiService);
  private ws     = inject(WebSocketService);
  private router = inject(Router);

  players  = signal<SpectatorPlayer[]>([]);
  watchId  = signal<number | null>(null);
  puzzle   = signal<number[][]>([]);
  rows     = [0,1,2,3,4,5,6,7,8];

  private sub?: Subscription;

  readonly watched = computed(() => {
    const id = this.watchId();
    return this.players().find(p => p.id === id) ?? null;
  });

  readonly progress = computed(() => {
    const w = this.watched();
    if (!w || w.total === 0) return 0;
    return Math.round((w.filled / w.total) * 100);
  });

  ngOnInit(): void {
    const s = this.gs.state();
    if (!s.multiplayer || !s.playerId || !s.roomPin) {
      this.router.navigate(['/lobby']); return;
    }

    // conecta WebSocket se ainda não conectado
    this.ws.connect();
    this.ws.subscribeToRoom(s.roomPin);

    // carrega estado atual da sala
    this.api.getRoomState(s.roomPin, s.playerId).subscribe({
      next: res => {
        if (!res.success || !res.data) { this.router.navigate(['/lobby']); return; }
        const puz = res.data.puzzle ?? [];
        this.puzzle.set(puz);
        const total = puz.flat().filter(v => v === 0).length;

        const list: SpectatorPlayer[] = (res.data.players ?? [])
          .filter((p: any) => p.id !== s.playerId) // não mostrar a si mesmo
          .map((p: any) => ({
            id:          p.id,
            name:        p.name,
            errors:      p.errors_count ?? 0,
            filled:      p.filled_count ?? 0,
            total,
            board:       p.board_state ?? puz.map((row: number[]) => [...row]),
            isEliminated: p.is_eliminated,
            isWinner:    false,
          }));

        this.players.set(list);
        // seleciona automaticamente primeiro jogador ativo
        const first = list.find(p => !p.isEliminated);
        if (first) this.watchId.set(first.id);
      },
      error: () => this.router.navigate(['/lobby']),
    });

    this.sub = this.ws.events$.subscribe(evt => this.handleWs(evt.type, evt.payload));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  selectPlayer(id: number): void {
    this.watchId.set(id);
  }

  isGiven(r: number, c: number): boolean {
    const puz = this.puzzle();
    return puz.length > 0 && puz[r]?.[c] !== 0;
  }

  cellValue(r: number, c: number): number {
    const w = this.watched();
    return w?.board[r]?.[c] ?? 0;
  }

  back(): void {
    this.router.navigate(['/lobby']);
  }

  private handleWs(type: string, payload: unknown): void {
    if (type === 'PlayerMoved') {
      const p = payload as PlayerMovedPayload;
      this.players.update(list => list.map(pl => {
        if (pl.id !== p.playerId) return pl;
        const board = pl.board.map(row => [...row]);
        board[p.r][p.c] = p.value;
        return { ...pl, board, errors: p.errors, filled: p.filled };
      }));
    }

    if (type === 'PlayerEliminated') {
      const p = payload as PlayerEliminatedPayload;
      this.players.update(list => list.map(pl =>
        pl.id === p.playerId ? { ...pl, isEliminated: true } : pl
      ));
      // se estava assistindo este jogador, muda para outro ativo
      if (this.watchId() === p.playerId) {
        const next = this.players().find(pl => !pl.isEliminated && pl.id !== p.playerId);
        this.watchId.set(next?.id ?? null);
      }
    }

    if (type === 'MissionAccomplished') {
      const p = payload as MissionAccomplishedPayload;
      this.players.update(list => list.map(pl =>
        pl.id === p.winnerId ? { ...pl, isWinner: true } : pl
      ));
    }
  }
}

import { Component, inject, HostListener, signal, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CellComponent } from '../cell/cell.component';
import { GameStateService } from '../../../core/services/game-state.service';
import { AudioService } from '../../../core/services/audio.service';
import { WebSocketService, MissionAccomplishedPayload } from '../../../core/services/websocket.service';
import { GameApiService } from '../../../core/services/game-api.service';
import { CellPosition } from '../../../core/models/game-state.model';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CellComponent],
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
})
export class BoardComponent implements OnInit, OnDestroy {

  private gs     = inject(GameStateService);
  private audio  = inject(AudioService);
  private ws     = inject(WebSocketService);
  private api    = inject(GameApiService);
  private router = inject(Router);

  readonly state    = this.gs.state;
  readonly wrongCell = this.gs.wrongCell;
  readonly rows     = [0,1,2,3,4,5,6,7,8];
  readonly emptySet = new Set<number>();

  shakingCell = signal<CellPosition | null>(null);
  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.ws.events$.subscribe(evt => this.handleWs(evt.type, evt.payload)),
      this.gs.eliminated$.subscribe(() => this.onEliminated()),
      this.gs.timeout$.subscribe(() => this.onTimeout()),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.audio.suspend();
  }

  isSelected(r: number, c: number): boolean {
    const s = this.state().sel;
    return s.r === r && s.c === c;
  }

  isHlLine(r: number, c: number): boolean {
    const s = this.state().sel;
    if (s.r < 0) return false;
    return (r === s.r || c === s.c) && !this.isSelected(r, c);
  }

  isHlBlock(r: number, c: number): boolean {
    const s = this.state().sel;
    if (s.r < 0) return false;
    return (
      Math.floor(r / 3) === Math.floor(s.r / 3) &&
      Math.floor(c / 3) === Math.floor(s.c / 3) &&
      !this.isSelected(r, c) && !this.isHlLine(r, c)
    );
  }

  isHlSame(r: number, c: number): boolean {
    const s = this.state();
    const selVal = s.board[s.sel.r]?.[s.sel.c];
    if (!selVal || selVal === 0) return false;
    return s.board[r][c] === selVal && !this.isSelected(r, c);
  }

  isShaking(r: number, c: number): boolean {
    const sk = this.shakingCell();
    return sk !== null && sk.r === r && sk.c === c;
  }

  // valor da célula: usa o board normal, mas mostra número errado temporariamente
  getCellValue(r: number, c: number): number {
    const w = this.wrongCell();
    if (w && w.r === r && w.c === c) return w.value;
    return this.state().board[r]?.[c] ?? 0;
  }

  // célula com número errado temporário
  isWrongEntry(r: number, c: number): boolean {
    const w = this.wrongCell();
    return w !== null && w.r === r && w.c === c;
  }

  onCellClick(r: number, c: number): void {
    if (this.state().gameOver) return;
    this.gs.selectCell({ r, c });
    this.audio.resume();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (this.state().gameOver) return;
    const key = e.key;
    const code = e.code;

    const isMainNum   = /^[1-9]$/.test(key);
    const isNumpadNum = code.startsWith('Numpad') && /^[1-9]$/.test(code.replace('Numpad', ''));
    if (isMainNum || isNumpadNum) {
      e.preventDefault();
      this.doInput(parseInt(isMainNum ? key : code.replace('Numpad', '')));
      return;
    }

    if (['Backspace', 'Delete', '0'].includes(key) || code === 'Numpad0') {
      this.gs.eraseCell(); return;
    }

    const { r, c } = this.state().sel;
    if (r < 0) return;
    const moves: Record<string, CellPosition> = {
      ArrowUp:    { r: Math.max(0, r - 1), c },
      ArrowDown:  { r: Math.min(8, r + 1), c },
      ArrowLeft:  { r, c: Math.max(0, c - 1) },
      ArrowRight: { r, c: Math.min(8, c + 1) },
    };
    if (moves[key]) { e.preventDefault(); this.gs.selectCell(moves[key]); }
  }

  private doInput(n: number): void {
    const { r, c } = this.state().sel;
    const result = this.gs.inputValue(n);
    switch (result) {
      case 'correct': {
        this.audio.play('type');
        const s = this.state();
        if (s.multiplayer && s.playerId) {
          this.api.reportMove(s.roomPin, s.playerId, r, c, n, s.errors, s.filled).subscribe();
        }
        break;
      }
      case 'wrong':
        this.audio.play('error');
        this.triggerShake(r, c);
        break;
      case 'eliminated':
        this.audio.play('error');
        this.triggerShake(r, c);
        break;
      case 'win':
        this.audio.play('win');
        this.handleVictory();
        break;
    }
  }

  private triggerShake(r: number, c: number): void {
    this.shakingCell.set({ r, c });
    setTimeout(() => this.shakingCell.set(null), 420);
  }

  private handleVictory(): void {
    this.gs.markGameOver();
    const s = this.state();
    if (s.multiplayer && s.playerId) {
      this.api.claimVictory(s.roomPin, s.playerId, s.errors, 3 - s.hints).subscribe();
    }
    this.router.navigate(['/cinematic'], { state: { outcome: 'win', errors: s.errors, hints: 3 - s.hints } });
  }

  private onEliminated(): void {
    const s = this.state();
    if (s.multiplayer && s.playerId) {
      this.api.eliminatePlayer(s.roomPin, s.playerId, s.errors, 3 - s.hints).subscribe();
      this.gs.setSpectator();
      this.router.navigate(['/spectate']);
    } else {
      this.gs.setSpectator();
      this.router.navigate(['/cinematic'], { state: { outcome: 'lose', errors: s.errors, hints: 3 - s.hints } });
    }
  }

  private onTimeout(): void {
    const s = this.state();
    if (s.multiplayer && s.playerId) {
      this.api.eliminatePlayer(s.roomPin, s.playerId, s.errors, 3 - s.hints).subscribe();
      this.gs.setSpectator();
      this.router.navigate(['/spectate']);
    } else {
      this.gs.setSpectator();
      this.router.navigate(['/cinematic'], { state: { outcome: 'lose', reason: 'timeout', errors: s.errors, hints: 3 - s.hints } });
    }
  }

  private handleWs(type: string, payload: unknown): void {
    if (type === 'MissionAccomplished') {
      const p = payload as MissionAccomplishedPayload;
      if (!this.state().gameOver) {
        this.gs.markGameOver();
        this.gs.setSpectator();
        const s = this.state();
        this.router.navigate(['/cinematic'], { state: { outcome: 'lose', winnerName: p.winnerName, errors: s.errors, hints: 3 - s.hints } });
      }
    }
  }
}

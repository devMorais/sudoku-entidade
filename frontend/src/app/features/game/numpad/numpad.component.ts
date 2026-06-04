import { Component, inject } from '@angular/core';
import { GameStateService } from '../../../core/services/game-state.service';
import { GameApiService } from '../../../core/services/game-api.service';
import { AudioService } from '../../../core/services/audio.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-numpad',
  standalone: true,
  template: `
    <div class="numpad-wrapper">
      <div class="controls-row">
        <button class="ctrl-btn" [class.active]="gs.notesMode()" (click)="gs.toggleNotesMode()" title="Modo notas BENJI (N)">
          <span>✎</span> BENJI
        </button>
        <button class="ctrl-btn" [disabled]="gs.state().hints === 0" (click)="useHint()" title="Dica">
          <span>◉</span> DICA ({{ gs.state().hints }})
        </button>
        <button class="ctrl-btn danger" (click)="exitGame()" title="Sair do jogo">✕ SAIR</button>
      </div>

      <div class="numpad">
        @for (n of digits; track n) {
          <button class="num-btn" (click)="input(n)">{{ n }}</button>
        }
        <button class="num-btn erase" (click)="erase()">⌫</button>
      </div>
    </div>
  `,
  styleUrls: ['./numpad.component.scss'],
})
export class NumpadComponent {
  gs    = inject(GameStateService);
  api   = inject(GameApiService);
  audio = inject(AudioService);
  private router = inject(Router);

  readonly digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  input(n: number): void {
    if (this.gs.state().gameOver) return;
    const { r, c } = this.gs.state().sel;
    const result = this.gs.inputValue(n);
    if (result === 'note') this.audio.play('type');
    if (result === 'correct') {
      this.audio.play('type');
      const s = this.gs.state();
      if (s.multiplayer && s.playerId) {
        this.api.reportMove(s.roomPin, s.playerId, r, c, n, s.errors, s.filled).subscribe();
      }
    }
    if (result === 'wrong') this.audio.play('error');
    if (result === 'eliminated') this.audio.play('error');
    if (result === 'win') {
      this.audio.play('win');
      const s = this.gs.state();
      this.router.navigate(['/cinematic'], { state: { outcome: 'win', errors: s.errors, hints: 3 - s.hints } });
    }
  }

  erase(): void {
    this.gs.eraseCell();
  }

  useHint(): void {
    if (this.gs.useHint()) this.audio.play('hint');
  }

  exitGame(): void {
    this.gs.stopTimer();
    this.gs.clearSession();
    this.router.navigate(['/lobby']);
  }
}

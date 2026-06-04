import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-cinematic',
  standalone: true,
  template: `
    <div class="cinematic-screen">
      <div class="logo-block">
        <div class="logo-text">ENTIDADE</div>
        <div class="logo-sub">{{ outcome() === 'win' ? 'MISSÃO CUMPRIDA' : 'AGENTE ELIMINADO' }}</div>
      </div>

      <div class="lines-output">
        @for (line of visibleLines(); track $index) {
          <p class="output-line" [class.accent]="line.startsWith('>')">{{ line }}</p>
        }
      </div>

      <div class="stats" [class.visible]="showStats()">
        <div class="stat-card">
          <span class="stat-label">TEMPO</span>
          <span class="stat-value">{{ formattedTime }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">ERROS</span>
          <span class="stat-value" [class.red]="errors > 0">{{ errors }}/{{ gs.state().maxErr }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">DICAS</span>
          <span class="stat-value">{{ hints }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">RESULTADO</span>
          <span class="stat-value" [class.green]="outcome() === 'win'" [class.red]="outcome() !== 'win'">
            {{ outcome() === 'win' ? 'VITÓRIA' : 'ELIMINADO' }}
          </span>
        </div>
      </div>

      @if (showStats()) {
        <button class="btn-primary" (click)="restart()">NOVA MISSÃO</button>
      }
    </div>
  `,
  styleUrls: ['./cinematic.component.scss'],
})
export class CinematicComponent implements OnInit {
  private router = inject(Router);
  gs = inject(GameStateService);

  outcome   = signal<'win' | 'lose'>('win');
  winnerName = '';
  errors = 0;
  hints  = 0;
  formattedTime = '';

  visibleLines = signal<string[]>([]);
  showStats    = signal(false);

  private winLines  = ['> CODEX DECIFRADO', '> PROTOCOLO ENCERRADO', '> BEM-VINDO, AGENTE', '> MISSÃO CUMPRIDA'];
  private loseLines = ['> FALHA DETECTADA', '> PROTOCOLO ABORTADO', '> AGENTE COMPROMETIDO', '> MISSÃO FRACASSADA'];

  ngOnInit(): void {
    const nav = history.state;
    this.outcome.set(nav?.outcome === 'win' ? 'win' : 'lose');
    this.winnerName = nav?.winnerName ?? '';
    this.errors = nav?.errors ?? this.gs.state().errors;
    this.hints  = nav?.hints  ?? (3 - this.gs.state().hints);

    const t = this.gs.state().maxTime - this.gs.state().timeLeft;
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = (t % 60).toString().padStart(2, '0');
    this.formattedTime = `${m}:${s}`;

    // copia o array para não mutar o original entre partidas
    const lines = [...(this.outcome() === 'win' ? this.winLines : this.loseLines)];
    if (this.winnerName) lines.push(`> VENCEDOR: ${this.winnerName.toUpperCase()}`);
    if (nav?.reason === 'timeout') lines.push('> TEMPO ESGOTADO');

    this.animateLines(lines);
  }

  private animateLines(lines: string[]): void {
    let i = 0;
    const id = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(id);
        setTimeout(() => this.showStats.set(true), 400);
        return;
      }
      this.visibleLines.update(l => [...l, lines[i++]]);
    }, 600);
  }

  restart(): void {
    // reseta o estado do jogo antes de voltar ao lobby
    this.gs.clearSession();
    this.router.navigate(['/lobby']);
  }
}

import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../core/services/game-state.service';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-hud',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hud">
      <div class="hud-item">
        <span class="hud-label">TEMPO</span>
        <span class="hud-value" [class.critical]="timeLeft() < 60">{{ formattedTime() }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">ERROS</span>
        <span class="hud-value" [class.critical]="gs.errors() >= gs.state().maxErr - 1">
          {{ gs.errors() }}/{{ gs.state().maxErr }}
        </span>
      </div>
      <div class="hud-item">
        <span class="hud-label">DICAS</span>
        <span class="hud-value">{{ gs.hints() }}</span>
      </div>
      <div class="hud-item progress-item">
        <span class="hud-label">PROGRESSO</span>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="gs.progress()"></div>
        </div>
        <span class="hud-value small">{{ gs.progress() }}%</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">DIFICULDADE</span>
        <span class="hud-value small">{{ gs.state().diff.toUpperCase() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./hud.component.scss'],
})
export class HudComponent {
  gs = inject(GameStateService);
  audio = inject(AudioService);

  readonly timeLeft = this.gs.timeLeft;

  readonly formattedTime = computed(() => {
    const t = this.timeLeft();
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = (t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });
}

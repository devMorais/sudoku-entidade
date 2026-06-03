import { Component } from '@angular/core';
import { BoardComponent } from './board/board.component';
import { HudComponent } from './hud/hud.component';
import { NumpadComponent } from './numpad/numpad.component';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [BoardComponent, HudComponent, NumpadComponent],
  template: `
    <div class="game-screen">
      <app-hud />
      <div class="arena">
        <app-board />
        <app-numpad />
      </div>
    </div>
  `,
  styleUrls: ['./game.component.scss'],
})
export class GameComponent {}

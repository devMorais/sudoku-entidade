import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-cell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="cell"
      [class.given]="given"
      [class.selected]="selected"
      [class.hl-line]="hlLine"
      [class.hl-block]="hlBlock"
      [class.hl-same]="hlSame"
      [class.error]="hasError"
      [class.shake]="shaking"
      (click)="clicked.emit()"
    >
      @if (value !== 0) {
        <span class="cell-value" [class.user-fill]="!given">{{ value }}</span>
      } @else if (notes.size > 0) {
        <div class="notes-grid">
          @for (n of [1,2,3,4,5,6,7,8,9]; track n) {
            <span class="note" [class.visible]="notes.has(n)">{{ notes.has(n) ? n : '' }}</span>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./cell.component.scss'],
})
export class CellComponent {
  @Input() value   = 0;
  @Input() given   = false;
  @Input() selected = false;
  @Input() hlLine  = false;
  @Input() hlBlock = false;
  @Input() hlSame  = false;
  @Input() hasError = false;
  @Input() shaking = false;
  @Input() notes: Set<number> = new Set();
  @Output() clicked = new EventEmitter<void>();
}

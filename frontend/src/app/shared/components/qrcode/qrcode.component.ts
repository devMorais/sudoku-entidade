import { Component, Input, OnChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qrcode',
  standalone: true,
  template: `
    <div class="qr-wrapper">
      <canvas #canvas></canvas>
      <p class="qr-label">ESCANEIE PARA INFILTRAR</p>
    </div>
  `,
  styles: [`
    .qr-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
    }

    canvas {
      border: 2px solid rgba(0,255,136,0.3);
      border-radius: 6px;
      background: #fff;
      display: block;
    }

    .qr-label {
      font-size: 0.52rem;
      letter-spacing: 0.15em;
      color: var(--muted);
      text-align: center;
    }
  `],
})
export class QrcodeComponent implements OnChanges, AfterViewInit {
  @Input() value = '';
  @Input() size  = 140;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ready = false;

  ngAfterViewInit(): void {
    this.ready = true;
    this.generate();
  }

  ngOnChanges(): void {
    if (this.ready) this.generate();
  }

  private generate(): void {
    if (!this.value || !this.canvasRef) return;
    QRCode.toCanvas(this.canvasRef.nativeElement, this.value, {
      width: this.size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tutorial',
  standalone: true,
  imports: [],
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.scss'],
})
export class TutorialComponent implements OnInit {
  constructor(private router: Router) {}

  typedText = signal('');
  showCards = signal(false);
  showBtn   = signal(false);

  private fullText = '> PROTOCOLO ATIVO. BEM-VINDO, AGENTE.';

  ngOnInit(): void {
    this.typeWriter(this.fullText, () => {
      setTimeout(() => this.showCards.set(true), 300);
      setTimeout(() => this.showBtn.set(true), 800);
    });
  }

  private typeWriter(text: string, onDone: () => void): void {
    let i = 0;
    const id = setInterval(() => {
      this.typedText.set(text.slice(0, ++i));
      if (i >= text.length) { clearInterval(id); onDone(); }
    }, 40);
  }

  proceed(): void { this.router.navigate(['/lobby']); }
  donation(): void { this.router.navigate(['/donation']); }
}

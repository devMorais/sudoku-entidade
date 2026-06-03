import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameApiService } from '../../core/services/game-api.service';

@Component({
  selector: 'app-donation',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './donation.component.html',
  styleUrls: ['./donation.component.scss'],
})
export class DonationComponent implements OnInit {
  private api    = inject(GameApiService);
  private router = inject(Router);

  presets = [500, 1000, 2000];    // em centavos
  selectedAmount = signal(1000);
  customAmount   = '';

  donorName  = '';
  donorEmail = '';

  loading = signal(false);
  error   = signal('');
  stats   = signal<{ total_donations: number; total_amount_reais: string } | null>(null);

  ngOnInit(): void {
    this.api.getDonationStats().subscribe({
      next: res => { if (res.success && res.data) this.stats.set(res.data); },
      error: () => {},
    });
  }

  selectPreset(cents: number): void {
    this.selectedAmount.set(cents);
    this.customAmount = '';
  }

  onCustomInput(): void {
    const val = parseFloat(this.customAmount.replace(',', '.'));
    if (!isNaN(val) && val > 0) this.selectedAmount.set(Math.round(val * 100));
  }

  getAmount(): number {
    return this.selectedAmount();
  }

  formatReais(cents: number): string {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  }

  isActive(cents: number): boolean {
    return this.selectedAmount() === cents && !this.customAmount;
  }

  confirm(): void {
    if (this.getAmount() < 100) { this.error.set('Valor mínimo: R$ 1,00'); return; }
    this.error.set('');
    this.loading.set(true);

    this.api.createDonation(this.getAmount(), this.donorName || 'Agente Anônimo', this.donorEmail).subscribe({
      next: res => {
        this.loading.set(false);
        if (!res.success || !res.data) { this.error.set(res.message || 'Erro ao processar doação'); return; }
        window.open(res.data.checkout_url, '_blank');
      },
      error: () => { this.loading.set(false); this.error.set('Erro de conexão. Tente novamente.'); },
    });
  }

  back(): void {
    this.router.navigate(['/']);
  }
}

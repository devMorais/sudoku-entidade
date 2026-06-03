import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-donation',
  standalone: true,
  templateUrl: './donation.component.html',
  styleUrls: ['./donation.component.scss'],
})
export class DonationComponent {
  private router = inject(Router);

  back(): void {
    this.router.navigate(['/']);
  }
}

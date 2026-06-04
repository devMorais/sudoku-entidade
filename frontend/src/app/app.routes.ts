import { Routes } from '@angular/router';
import { gameGuard } from './core/guards/game.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/tutorial/tutorial.component').then(m => m.TutorialComponent),
  },
  {
    path: 'lobby',
    loadComponent: () => import('./features/lobby/lobby.component').then(m => m.LobbyComponent),
  },
  {
    path: 'game',
    canActivate: [gameGuard],
    loadComponent: () => import('./features/game/game.component').then(m => m.GameComponent),
  },
  {
    path: 'cinematic',
    loadComponent: () => import('./features/cinematic/cinematic.component').then(m => m.CinematicComponent),
  },
  {
    path: 'spectate',
    loadComponent: () => import('./features/spectate/spectate.component').then(m => m.SpectateComponent),
  },
  {
    path: 'donation',
    loadComponent: () => import('./features/donation/donation.component').then(m => m.DonationComponent),
  },
  { path: '**', redirectTo: '' },
];

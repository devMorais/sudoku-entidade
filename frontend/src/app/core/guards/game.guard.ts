import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameStateService } from '../services/game-state.service';

export const gameGuard: CanActivateFn = () => {
  const gs     = inject(GameStateService);
  const router = inject(Router);

  // permite acesso se o puzzle foi carregado (sol tem conteúdo)
  if (gs.state().sol.length > 0) return true;

  // sem puzzle → volta ao lobby
  return router.createUrlTree(['/lobby']);
};

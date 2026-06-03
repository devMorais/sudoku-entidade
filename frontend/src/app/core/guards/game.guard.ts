import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { GameStateService } from '../services/game-state.service';
import { GameApiService } from '../services/game-api.service';
import { WebSocketService } from '../services/websocket.service';
import { Difficulty } from '../models/room.model';

export const gameGuard: CanActivateFn = () => {
  const gs     = inject(GameStateService);
  const api    = inject(GameApiService);
  const ws     = inject(WebSocketService);
  const router = inject(Router);

  // jogo já carregado em memória → acesso direto
  if (gs.state().sol.length > 0) return true;

  // tenta recuperar sessão multiplayer salva (após F5)
  const session = gs.loadSavedSession();
  if (!session) return router.createUrlTree(['/lobby']);

  const { roomPin, playerId, playerName, isLeader, diff } = session;

  return api.getRoomState(roomPin, playerId).pipe(
    map(res => {
      if (!res.success || !res.data) {
        gs.clearSession();
        return router.createUrlTree(['/lobby']);
      }

      const { room, your_status, puzzle, solution } = res.data;

      // sala encerrada → cinematic como espectador
      if (room.status === 'finished') {
        gs.clearSession();
        gs.setMultiplayerContext(roomPin, playerId, isLeader, playerName);
        gs.setSpectator();
        router.navigate(['/cinematic'], { state: { outcome: your_status.is_winner ? 'win' : 'lose', errors: 0, hints: 0 } });
        return false;
      }

      // sala ainda em jogo → restaura estado
      if (room.status === 'playing' && puzzle && solution) {
        gs.setMultiplayerContext(roomPin, playerId, isLeader, playerName);
        gs.startFromPuzzle(puzzle, solution, (room.difficulty as Difficulty) ?? diff);
        ws.connect();
        ws.subscribeToRoom(roomPin);
        return true;
      }

      // sala voltou para waiting (improvável mas seguro)
      gs.clearSession();
      return router.createUrlTree(['/lobby']);
    }),
    catchError(() => {
      gs.clearSession();
      return of(router.createUrlTree(['/lobby']));
    })
  );
};

import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { environment } from '../../../environments/environment';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface WsEvent<T = unknown> {
  type: string;
  payload: T;
}

export interface PlayerJoinedPayload  { pin: string; playerId: number; playerName: string }
export interface PlayerLeftPayload    { pin: string; playerId: number; playerName: string }
export interface GameStartedPayload   { pin: string; puzzle: number[][]; solution: number[][]; difficulty?: string }
export interface PlayerEliminatedPayload { pin: string; playerId: number }
export interface MissionAccomplishedPayload { pin: string; winnerName: string; winnerId: number }
export interface LeaderChangedPayload { pin: string; newLeaderId: number; newLeaderName: string }
export interface PlayerMovedPayload   { pin: string; playerId: number; r: number; c: number; value: number; errors: number; filled: number }

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private echo: Echo<'pusher'> | null = null;

  readonly connectionState$ = new Subject<ConnectionState>();
  readonly events$ = new Subject<WsEvent>();

  connect(): void {
    if (this.echo) return;

    (window as any).Pusher = Pusher;

    this.echo = new Echo({
      broadcaster: 'pusher',
      key: environment.pusher.key,
      cluster: environment.pusher.cluster,
      forceTLS: environment.pusher.forceTLS,
    });

    const conn = (this.echo.connector as any).pusher.connection;
    conn.bind('state_change', ({ current }: { current: string }) => {
      const map: Record<string, ConnectionState> = {
        connecting: 'connecting',
        connected: 'connected',
        disconnected: 'disconnected',
        unavailable: 'failed',
        failed: 'failed',
      };
      this.connectionState$.next(map[current] ?? 'connecting');
    });
  }

  subscribeToRoom(pin: string): void {
    if (!this.echo) this.connect();

    this.echo!
      .channel(`room.${pin}`)
      .listen('.PlayerJoined', (p: PlayerJoinedPayload) =>
        this.events$.next({ type: 'PlayerJoined', payload: p }))
      .listen('.PlayerLeft', (p: PlayerLeftPayload) =>
        this.events$.next({ type: 'PlayerLeft', payload: p }))
      .listen('.GameStarted', (p: GameStartedPayload) =>
        this.events$.next({ type: 'GameStarted', payload: p }))
      .listen('.PlayerEliminated', (p: PlayerEliminatedPayload) =>
        this.events$.next({ type: 'PlayerEliminated', payload: p }))
      .listen('.MissionAccomplished', (p: MissionAccomplishedPayload) =>
        this.events$.next({ type: 'MissionAccomplished', payload: p }))
      .listen('.LeaderChanged', (p: LeaderChangedPayload) =>
        this.events$.next({ type: 'LeaderChanged', payload: p }))
      .listen('.PlayerMoved', (p: PlayerMovedPayload) =>
        this.events$.next({ type: 'PlayerMoved', payload: p }));
  }

  leaveRoom(pin: string): void {
    this.echo?.leaveChannel(`room.${pin}`);
  }

  disconnect(): void {
    this.echo?.disconnect();
    this.echo = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}

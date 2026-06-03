import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomStateResponse,
  DonationResponse,
  DonationStatsResponse,
} from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class GameApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  createRoom(
    name: string,
    difficulty: string,
    puzzle: number[][],
    solution: number[][]
  ): Observable<ApiResponse<CreateRoomResponse>> {
    return this.http.post<ApiResponse<CreateRoomResponse>>(`${this.base}/rooms`, {
      name,
      difficulty,
      puzzle,
      solution,
    });
  }

  joinRoom(pin: string, name: string): Observable<ApiResponse<JoinRoomResponse>> {
    return this.http.post<ApiResponse<JoinRoomResponse>>(`${this.base}/rooms/join`, { pin, name });
  }

  startGame(pin: string, playerId: number): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/rooms/${pin}/start`, { player_id: playerId });
  }

  claimVictory(pin: string, playerId: number, errors: number, hintsUsed: number): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/rooms/${pin}/victory`, {
      player_id:   playerId,
      errors_count: errors,
      hints_used:  hintsUsed,
    });
  }

  eliminatePlayer(pin: string, playerId: number, errors: number, hintsUsed: number): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/rooms/${pin}/eliminate`, {
      player_id:   playerId,
      errors_count: errors,
      hints_used:  hintsUsed,
    });
  }

  getRoomState(pin: string, playerId: number): Observable<ApiResponse<RoomStateResponse>> {
    return this.http.get<ApiResponse<RoomStateResponse>>(
      `${this.base}/rooms/${pin}/state?player_id=${playerId}`
    );
  }

  leaveRoom(pin: string, playerId: number): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/rooms/${pin}/leave`, { player_id: playerId });
  }

  createDonation(amount: number, donorName: string, donorEmail: string): Observable<ApiResponse<DonationResponse>> {
    return this.http.post<ApiResponse<DonationResponse>>(`${this.base}/donations`, {
      amount,
      donor_name:  donorName,
      donor_email: donorEmail,
    });
  }

  getDonationStats(): Observable<ApiResponse<DonationStatsResponse>> {
    return this.http.get<ApiResponse<DonationStatsResponse>>(`${this.base}/donations/stats`);
  }
}

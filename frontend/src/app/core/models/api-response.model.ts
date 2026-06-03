export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: Record<string, string[]>;
}

export interface CreateRoomResponse {
  room: { id: number; pin: string; difficulty: string; puzzle: number[][]; solution: number[][] };
  player: { id: number; name: string; is_leader: true };
}

export interface JoinRoomResponse {
  player: { id: number; name: string; is_leader: boolean };
  joined: boolean;
}

export interface RoomStateResponse {
  room: { pin: string; status: string; difficulty: string; players_count: number };
  players: Array<{ id: number; name: string; is_leader: boolean; is_eliminated: boolean }>;
  your_status: { is_eliminated: boolean; is_winner: boolean };
  puzzle: number[][] | null;
}

export interface DonationResponse {
  checkout_url: string;
  donation_id: number;
}

export interface DonationStatsResponse {
  total_donations: number;
  total_amount_reais: string;
  last_donation_at: string | null;
}

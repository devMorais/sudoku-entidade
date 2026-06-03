export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Room {
  id: number;
  pin: string;
  status: RoomStatus;
  difficulty: Difficulty;
  puzzle: number[][] | null;
  winner_id: number | null;
  players_count?: number;
  max_players?: number;
  created_at: string;
  updated_at: string;
}

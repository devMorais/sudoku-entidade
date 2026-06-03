export interface Player {
  id: number;
  room_id: number;
  name: string;
  is_leader: boolean;
  is_eliminated: boolean;
  is_winner: boolean;
  errors_count: number;
  hints_used: number;
  finished_at: string | null;
  created_at: string;
}

import { Difficulty } from './room.model';

export interface GamePlayer {
  id: number;
  name: string;
  is_leader: boolean;
  is_eliminated: boolean;
  is_winner: boolean;
}

export interface CellPosition {
  r: number;
  c: number;
}

export interface GameState {
  // tabuleiro
  sol: number[][];
  puz: number[][];
  board: number[][];          // estado atual do jogador (0 = vazio)
  notes: Set<number>[][];     // notas BENJI por célula
  given: boolean[][];         // células pré-preenchidas (não editáveis)

  // seleção e modo
  sel: CellPosition;
  notesMode: boolean;

  // timer
  timeLeft: number;
  maxTime: number;
  startTime: number;

  // placar
  errors: number;
  maxErr: number;
  hints: number;
  filled: number;
  total: number;

  // configuração
  diff: Difficulty;
  gameOver: boolean;

  // multiplayer
  multiplayer: boolean;
  roomPin: string;
  playerId: number | null;
  isLeader: boolean;
  isSpectator: boolean;
  playerName: string;
}

export const INITIAL_GAME_STATE: GameState = {
  sol: [],
  puz: [],
  board: [],
  notes: [],
  given: [],
  sel: { r: -1, c: -1 },
  notesMode: false,
  timeLeft: 600,
  maxTime: 600,
  startTime: 0,
  errors: 0,
  maxErr: 5,
  hints: 3,
  filled: 0,
  total: 0,
  diff: 'medium',
  gameOver: false,
  multiplayer: false,
  roomPin: '',
  playerId: null,
  isLeader: false,
  isSpectator: false,
  playerName: '',
};

export const DIFFICULTY_CONFIG: Record<string, { clues: number; time: number; maxErr: number }> = {
  easy:   { clues: 44, time: 600, maxErr: 7 },
  medium: { clues: 34, time: 480, maxErr: 5 },
  hard:   { clues: 26, time: 360, maxErr: 3 },
};

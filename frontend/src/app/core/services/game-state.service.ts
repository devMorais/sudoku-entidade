import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { GameState, INITIAL_GAME_STATE, DIFFICULTY_CONFIG, CellPosition } from '../models/game-state.model';
import { Difficulty } from '../models/room.model';
import { SudokuService } from './sudoku.service';

const SESSION_KEY = 'sudoku_session';

@Injectable({ providedIn: 'root' })
export class GameStateService {

  private readonly _state = signal<GameState>({ ...INITIAL_GAME_STATE });

  // emite quando o tempo acaba ou o jogador é eliminado (para navegação)
  readonly eliminated$ = new Subject<void>();
  readonly timeout$    = new Subject<void>();

  // célula com número errado para exibição temporária (420ms)
  private readonly _wrongCell = signal<{ r: number; c: number; value: number } | null>(null);
  readonly wrongCell = this._wrongCell.asReadonly();

  // leituras reativas do estado
  readonly state = this._state.asReadonly();
  readonly board = computed(() => this._state().board);
  readonly sel = computed(() => this._state().sel);
  readonly errors = computed(() => this._state().errors);
  readonly hints = computed(() => this._state().hints);
  readonly timeLeft = computed(() => this._state().timeLeft);
  readonly notesMode = computed(() => this._state().notesMode);
  readonly gameOver = computed(() => this._state().gameOver);
  readonly progress = computed(() => {
    const s = this._state();
    return s.total > 0 ? Math.round((s.filled / s.total) * 100) : 0;
  });

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private sudoku: SudokuService) {}

  // inicializa partida com solução e puzzle gerados
  startNewGame(difficulty: Difficulty): void {
    const config = DIFFICULTY_CONFIG[difficulty];
    const sol = this.sudoku.generateSolution();
    const puz = this.sudoku.generatePuzzle(sol, difficulty);
    this.initGame(sol, puz, difficulty);
  }

  // inicializa partida a partir de puzzle externo (multiplayer)
  startFromPuzzle(puzzle: number[][], solution: number[][], difficulty: Difficulty): void {
    this.initGame(solution, puzzle, difficulty);
    // persiste sessão logo após iniciar para suportar F5
    setTimeout(() => this.saveSession(), 0);
  }

  private initGame(sol: number[][], puz: number[][], diff: Difficulty): void {
    const config = DIFFICULTY_CONFIG[diff];
    const board = puz.map(row => [...row]);
    const given = puz.map(row => row.map(v => v !== 0));
    const notes = this.sudoku.createEmptyNotes();
    const total = board.flat().filter(v => v === 0).length;

    this.stopTimer();

    this._state.set({
      ...this._state(),
      sol,
      puz,
      board,
      given,
      notes,
      sel: { r: -1, c: -1 },
      notesMode: false,
      timeLeft: config.time,
      maxTime: config.time,
      startTime: Date.now(),
      errors: 0,
      maxErr: config.maxErr,
      hints: 3,
      filled: 0,
      total,
      diff,
      gameOver: false,
    });

    this.startTimer();
  }

  // retorna valor que o jogador colocou (ou pré-preenchido)
  getCellValue(r: number, c: number): number {
    return this._state().board[r]?.[c] ?? 0;
  }

  getCellNotes(r: number, c: number): Set<number> {
    return this._state().notes[r]?.[c] ?? new Set();
  }

  isGiven(r: number, c: number): boolean {
    return this._state().given[r]?.[c] ?? false;
  }

  selectCell(pos: CellPosition): void {
    this._state.update(s => ({ ...s, sel: pos }));
  }

  toggleNotesMode(): void {
    this._state.update(s => ({ ...s, notesMode: !s.notesMode }));
  }

  // insere ou apaga valor na célula selecionada; retorna 'correct' | 'wrong' | 'note' | 'noop'
  inputValue(n: number): 'correct' | 'wrong' | 'note' | 'noop' | 'win' {
    const s = this._state();
    const { r, c } = s.sel;
    if (s.gameOver || r < 0 || this.isGiven(r, c)) return 'noop';

    if (s.notesMode) {
      const notes = s.notes.map(row => row.map(set => new Set(set)));
      if (notes[r][c].has(n)) notes[r][c].delete(n);
      else notes[r][c].add(n);
      this._state.update(st => ({ ...st, notes }));
      return 'note';
    }

    // modo normal — número correto
    if (n === s.sol[r][c]) {
      const board = s.board.map(row => [...row]);
      board[r][c] = n;
      const notes = this.clearNotesForValue(s.notes, r, c, n);
      const filled = s.filled + 1;
      this._state.update(st => ({ ...st, board, notes, filled }));
      if (filled === s.total) return 'win';
      return 'correct';
    } else {
      // número errado: mostra brevemente na célula e conta erro
      const errors = s.errors + 1;
      this._wrongCell.set({ r, c, value: n });
      this._state.update(st => ({ ...st, errors }));
      setTimeout(() => this._wrongCell.set(null), 420);

      if (errors >= s.maxErr) {
        this.markGameOver();
        this.eliminated$.next();
        return 'eliminated' as any;
      }
      return 'wrong';
    }
  }

  eraseCell(): void {
    const s = this._state();
    const { r, c } = s.sel;
    if (s.gameOver || r < 0 || this.isGiven(r, c)) return;
    const board = s.board.map(row => [...row]);
    const hadValue = board[r][c] !== 0;
    board[r][c] = 0;
    this._state.update(st => ({
      ...st,
      board,
      filled: hadValue ? st.filled - 1 : st.filled,
    }));
  }

  useHint(): boolean {
    const s = this._state();
    if (s.gameOver || s.hints <= 0) return false;
    // encontra células vazias não preenchidas pelo jogador
    const empty: CellPosition[] = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!s.given[r][c] && s.board[r][c] === 0) empty.push({ r, c });
    if (empty.length === 0) return false;

    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    const board = s.board.map(row => [...row]);
    board[r][c] = s.sol[r][c];
    const notes = this.clearNotesForValue(s.notes, r, c, s.sol[r][c]);
    this._state.update(st => ({
      ...st,
      board,
      notes,
      hints: st.hints - 1,
      filled: st.filled + 1,
      sel: { r, c },
    }));
    return true;
  }

  markGameOver(): void {
    this._state.update(s => ({ ...s, gameOver: true }));
    this.stopTimer();
    this.clearSession();
  }

  setMultiplayerContext(roomPin: string, playerId: number, isLeader: boolean, playerName: string): void {
    this._state.update(s => ({ ...s, multiplayer: true, roomPin, playerId, isLeader, playerName }));
  }

  // persiste sessão multiplayer no localStorage para sobreviver F5
  saveSession(): void {
    const s = this._state();
    if (!s.multiplayer || !s.playerId) return;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        roomPin:    s.roomPin,
        playerId:   s.playerId,
        playerName: s.playerName,
        isLeader:   s.isLeader,
        diff:       s.diff,
      }));
    } catch { /* ignora */ }
  }

  loadSavedSession(): { roomPin: string; playerId: number; playerName: string; isLeader: boolean; diff: Difficulty } | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  clearSession(): void {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignora */ }
  }

  setSpectator(): void {
    this._state.update(s => ({ ...s, isSpectator: true, gameOver: true }));
    this.stopTimer();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      // usa timestamp absoluto para não derivar em abas inativas
      const elapsed = Math.floor((Date.now() - this._state().startTime) / 1000);
      const timeLeft = Math.max(0, this._state().maxTime - elapsed);
      this._state.update(s => ({ ...s, timeLeft }));
      if (timeLeft === 0) {
      this.stopTimer();
      if (!this._state().gameOver) {
        this.markGameOver();
        this.timeout$.next();
      }
    }
    }, 500);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // limpa notas do valor n em toda a linha, coluna e bloco de (r,c)
  private clearNotesForValue(
    notes: Set<number>[][],
    r: number, c: number, n: number
  ): Set<number>[][] {
    const next = notes.map(row => row.map(set => new Set(set)));
    for (let i = 0; i < 9; i++) {
      next[r][i].delete(n);
      next[i][c].delete(n);
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++)
        next[br + dr][bc + dc].delete(n);
    return next;
  }
}

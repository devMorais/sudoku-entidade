import { Injectable } from '@angular/core';
import { Difficulty } from '../models/room.model';
import { DIFFICULTY_CONFIG } from '../models/game-state.model';

@Injectable({ providedIn: 'root' })
export class SudokuService {

  // embaralha array in-place e retorna
  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // índice do bloco 3x3 a partir de linha/coluna
  private blk(r: number, c: number): number {
    return Math.floor(r / 3) * 3 + Math.floor(c / 3);
  }

  // gera solução 9x9 válida por backtracking
  generateSolution(): number[][] {
    const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
    const rows = Array.from({ length: 9 }, () => new Set<number>());
    const cols = Array.from({ length: 9 }, () => new Set<number>());
    const blks = Array.from({ length: 9 }, () => new Set<number>());

    const fill = (pos: number): boolean => {
      if (pos === 81) return true;
      const r = Math.floor(pos / 9);
      const c = pos % 9;
      const b = this.blk(r, c);
      const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

      for (const n of nums) {
        if (!rows[r].has(n) && !cols[c].has(n) && !blks[b].has(n)) {
          grid[r][c] = n;
          rows[r].add(n); cols[c].add(n); blks[b].add(n);
          if (fill(pos + 1)) return true;
          grid[r][c] = 0;
          rows[r].delete(n); cols[c].delete(n); blks[b].delete(n);
        }
      }
      return false;
    };

    fill(0);
    return grid;
  }

  // verifica se puzzle tem solução única (conta até 2 para parar cedo)
  private countSolutions(grid: number[][], limit = 2): number {
    let count = 0;

    const rows = Array.from({ length: 9 }, () => new Set<number>());
    const cols = Array.from({ length: 9 }, () => new Set<number>());
    const blks = Array.from({ length: 9 }, () => new Set<number>());

    // preenche sets com valores existentes
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const n = grid[r][c];
        if (n !== 0) {
          rows[r].add(n); cols[c].add(n); blks[this.blk(r, c)].add(n);
        }
      }
    }

    const solve = (pos: number): void => {
      if (count >= limit) return;
      if (pos === 81) { count++; return; }
      const r = Math.floor(pos / 9);
      const c = pos % 9;
      if (grid[r][c] !== 0) { solve(pos + 1); return; }
      const b = this.blk(r, c);
      for (let n = 1; n <= 9; n++) {
        if (!rows[r].has(n) && !cols[c].has(n) && !blks[b].has(n)) {
          grid[r][c] = n;
          rows[r].add(n); cols[c].add(n); blks[b].add(n);
          solve(pos + 1);
          grid[r][c] = 0;
          rows[r].delete(n); cols[c].delete(n); blks[b].delete(n);
        }
      }
    };

    solve(0);
    return count;
  }

  // gera puzzle removendo pistas da solução, mantendo solução única
  generatePuzzle(solution: number[][], difficulty: Difficulty): number[][] {
    const config = DIFFICULTY_CONFIG[difficulty];
    const puzzle = solution.map(row => [...row]);
    const cells = this.shuffle(
      Array.from({ length: 81 }, (_, i) => ({ r: Math.floor(i / 9), c: i % 9 }))
    );

    let clues = 81;
    for (const { r, c } of cells) {
      if (clues <= config.clues) break;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
      // verifica solução única; se não: restaura
      if (this.countSolutions(puzzle.map(row => [...row])) !== 1) {
        puzzle[r][c] = backup;
      } else {
        clues--;
      }
    }

    return puzzle;
  }

  // inicializa a matriz de notas BENJI (9x9 de Sets vazios)
  createEmptyNotes(): Set<number>[][] {
    return Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<number>())
    );
  }

  // retorna as células do mesmo bloco que (r, c)
  blockCells(r: number, c: number): Array<{ r: number; c: number }> {
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    const cells: Array<{ r: number; c: number }> = [];
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++)
        cells.push({ r: br + dr, c: bc + dc });
    return cells;
  }
}

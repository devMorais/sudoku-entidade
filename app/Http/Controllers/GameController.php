<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\Player;
use App\Events\GameStarted;
use App\Events\MissionAccomplished;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Events\PlayerJoined;
use App\Events\PlayerEliminated;

class GameController extends Controller
{
    // Cria uma nova sala e gera o puzzle síncrono no backend
    public function createRoom()
    {
        do {
            $pin = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
        } while (Room::where('pin', $pin)->where('status', 'waiting')->exists());

        $solution = $this->generateSolution();
        $puzzle = $this->generatePuzzle($solution, 44); // 44 pistas = Nível Fácil

        $room = Room::create([
            'pin' => $pin,
            'puzzle' => $puzzle,
            'solution' => $solution,
            'status' => 'waiting'
        ]);

        return response()->json([
            'success' => true,
            'pin' => $pin,
            'room_id' => $room->id
        ]);
    }

    // Aluno entrando na sala pelo celular
    public function joinRoom(Request $request)
    {
        $request->validate([
            'pin' => 'required|string|size:4',
            'name' => 'required|string|max:25'
        ]);

        $room = Room::where('pin', $request->pin)->where('status', 'waiting')->first();

        if (!$room) {
            return response()->json(['success' => false, 'message' => 'Código de missão inválido ou sala já iniciada.'], 404);
        }

        $isLeader = !$room->players()->exists();

        $player = Player::create([
            'room_id' => $room->id,
            'name' => $request->name,
            'is_leader' => $isLeader
        ]);

        broadcast(new PlayerJoined($room->pin, $player->name, $player->id));

        // NOVO: Pega todos os agentes que JÁ ESTÃO na sala para atualizar a tela de quem acabou de entrar
        $existingPlayers = $room->players()->get(['id', 'name']);

        return response()->json([
            'success' => true,
            'player_id' => $player->id,
            'is_leader' => $isLeader,
            'players' => $existingPlayers, // Mandando a lista pelo túnel de dados!
            'room' => [
                'pin' => $room->pin,
                'status' => $room->status
            ]
        ]);
    }

    public function startGame($pin)
    {
        $room = Room::where('pin', $pin)->firstOrFail();
        $room->update(['status' => 'playing']);

        broadcast(new GameStarted($room));

        return response()->json([
            'success' => true,
            'puzzle' => $room->puzzle,
            'solution' => $room->solution
        ]);
    }

    // Aluno concluiu o Sudoku! O primeiro que bater aqui para o cronômetro global
    public function claimVictory(Request $request, $pin)
    {
        $room = Room::where('pin', $pin)->where('status', 'playing')->firstOrFail();
        $player = Player::findOrFail($request->player_id);

        $room->update([
            'status' => 'finished',
            'winner_id' => $player->id
        ]);

        $player->update(['finished_at' => now()]);

        broadcast(new MissionAccomplished($room, $player->name));

        return response()->json(['success' => true, 'winner' => $player->name]);
    }

    // ── AUXILIARES MATHEMATICOS DO SUDOKU (BACKTRACKING) ──
    private function generateSolution()
    {
        $g = array_fill(0, 9, array_fill(0, 9, 0));
        $this->fillGrid($g, 0);
        return $g;
    }

    private function fillGrid(&$g, $pos)
    {
        if ($pos === 81) return true;
        $r = (int)($pos / 9);
        $c = $pos % 9;

        $nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        shuffle($nums);

        foreach ($nums as $n) {
            if ($this->checkValid($g, $r, $c, $n)) {
                $g[$r][$c] = $n; // Adicionado o $ aqui
                if ($this->fillGrid($g, $pos + 1)) return true;
                $g[$r][$c] = 0;  // Adicionado o $ aqui
            }
        }
        return false;
    }

    private function checkValid($g, $r, $c, $n)
    {
        for ($i = 0; $i < 9; $i++) {
            if ($g[$r][$i] === $n || $g[$i][$c] === $n) return false;
        }
        $br = (int)($r / 3) * 3;
        $bc = (int)($c / 3) * 3;
        for ($i = 0; $i < 3; $i++) {
            for ($j = 0; $j < 3; $j++) {
                if ($g[$br + $i][$bc + $j] === $n) return false;
            }
        }
        return true;
    }

    private function generatePuzzle($sol, $clues)
    {
        $p = $sol;
        $cellsToRemove = 81 - $clues;
        while ($cellsToRemove > 0) {
            $r = rand(0, 8);
            $c = rand(0, 8);
            if ($p[$r][$c] !== 0) {
                $p[$r][$c] = 0;
                $cellsToRemove--;
            }
        }
        return $p;
    }

    public function eliminatePlayer(Request $request, $pin)
    {
        broadcast(new PlayerEliminated($pin, $request->player_id));
        return response()->json(['success' => true]);
    }
}

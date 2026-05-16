<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\Player;
use App\Events\GameStarted;
use App\Events\MissionAccomplished;
use Illuminate\Http\Request;
use App\Events\PlayerJoined;
use App\Events\PlayerEliminated;

class GameController extends Controller
{
    // O PC do Líder envia o puzzle criptográfico e o backend apenas guarda no cofre
    public function createRoom(Request $request)
    {
        // 1. Gera um PIN de 4 dígitos inédito
        do {
            $pin = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
        } while (Room::where('pin', $pin)->where('status', 'waiting')->exists());

        // 2. Salva o Puzzle recebido do frontend
        $room = Room::create([
            'pin' => $pin,
            'puzzle' => $request->solution ? $request->puzzle : [], // Garante que não venha nulo
            'solution' => $request->solution ? $request->solution : [],
            'status' => 'waiting'
        ]);

        return response()->json([
            'success' => true,
            'pin' => $pin,
            'room_id' => $room->id
        ]);
    }

    // Agente entrando na sala
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

        $existingPlayers = $room->players()->get(['id', 'name']);

        return response()->json([
            'success' => true,
            'player_id' => $player->id,
            'is_leader' => $isLeader,
            'players' => $existingPlayers,
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

        // A solução é enviada no start para que os agentes visitantes recebam a chave idêntica à do líder
        return response()->json([
            'success' => true,
            'puzzle' => $room->puzzle,
            'solution' => $room->solution
        ]);
    }

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

    public function eliminatePlayer(Request $request, $pin)
    {
        broadcast(new PlayerEliminated($pin, $request->player_id));
        return response()->json(['success' => true]);
    }
}

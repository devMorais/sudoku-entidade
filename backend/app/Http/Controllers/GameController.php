<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\Player;
use App\Events\GameStarted;
use App\Events\LeaderChanged;
use App\Events\MissionAccomplished;
use App\Events\PlayerJoined;
use App\Events\PlayerEliminated;
use App\Events\PlayerMoved;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GameController extends Controller
{
    // ─── Criar sala + registrar líder em uma única chamada ───────────────────
    public function createRoom(Request $request)
    {
        $request->validate([
            'name'       => 'required|string|max:30',
            'puzzle'     => 'required|array',
            'solution'   => 'required|array',
            'difficulty' => 'sometimes|in:easy,medium,hard',
        ]);

        // PIN único entre salas ativas
        $attempts = 0;
        do {
            $pin = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
            $attempts++;
            if ($attempts > 20) {
                return response()->json(['success' => false, 'message' => 'Não foi possível gerar sala. Tente novamente.'], 503);
            }
        } while (Room::where('pin', $pin)->where('status', '!=', 'finished')->exists());

        $room = Room::create([
            'pin'        => $pin,
            'puzzle'     => $request->puzzle,
            'solution'   => $request->solution,
            'status'     => 'waiting',
            'difficulty' => $request->input('difficulty', 'medium'),
        ]);

        $player = Player::create([
            'room_id'   => $room->id,
            'name'      => $request->name,
            'is_leader' => true,
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'room'   => [
                    'id'       => $room->id,
                    'pin'      => $room->pin,
                    'status'   => $room->status,
                    'puzzle'   => $room->puzzle,
                    'solution' => $room->solution,
                ],
                'player' => [
                    'id'        => $player->id,
                    'name'      => $player->name,
                    'is_leader' => true,
                ],
            ],
            'message' => 'Sala criada com sucesso.',
        ]);
    }

    // ─── Entrar na sala como visitante ───────────────────────────────────────
    public function joinRoom(Request $request)
    {
        $request->validate([
            'pin'  => 'required|string|size:4',
            'name' => 'required|string|max:30',
        ]);

        $room = Room::where('pin', $request->pin)->where('status', 'waiting')->first();

        if (!$room) {
            return response()->json([
                'success' => false,
                'message' => 'Sala não encontrada ou missão já iniciada.',
            ], 404);
        }

        // Evita duplicata: mesmo nome na mesma sala
        $existing = Player::where('room_id', $room->id)->where('name', $request->name)->first();
        if ($existing) {
            return response()->json([
                'success' => true,
                'data'    => [
                    'player' => [
                        'id'        => $existing->id,
                        'name'      => $existing->name,
                        'is_leader' => $existing->is_leader,
                    ],
                    'joined' => false,
                ],
                'message' => 'Reconectado à sala.',
            ]);
        }

        // Limite de 8 agentes por sala
        if ($room->players()->count() >= 8) {
            return response()->json(['success' => false, 'message' => 'Sala cheia — máximo de 8 agentes.'], 422);
        }

        $isLeader = !$room->players()->exists();
        $player   = Player::create([
            'room_id'   => $room->id,
            'name'      => $request->name,
            'is_leader' => $isLeader,
        ]);

        broadcast(new PlayerJoined($room->pin, $player->name, $player->id));

        return response()->json([
            'success' => true,
            'data'    => [
                'player' => [
                    'id'        => $player->id,
                    'name'      => $player->name,
                    'is_leader' => $isLeader,
                ],
                'joined' => true,
            ],
            'message' => 'Infiltração bem-sucedida.',
        ]);
    }

    // ─── Líder inicia o jogo — broadcast para todos ──────────────────────────
    public function startGame(Request $request, string $pin)
    {
        $room = Room::where('pin', $pin)->where('status', 'waiting')->first();

        if (!$room) {
            return response()->json(['success' => false, 'message' => 'Sala não encontrada ou jogo já iniciado.'], 409);
        }

        $room->update(['status' => 'playing']);
        broadcast(new GameStarted($room));

        return response()->json(['success' => true, 'message' => 'Protocolo iniciado.']);
    }

    // ─── Primeiro a completar reivindica a vitória ───────────────────────────
    public function claimVictory(Request $request, string $pin)
    {
        $updated = DB::table('rooms')
            ->where('pin', $pin)
            ->where('status', 'playing')
            ->whereNull('winner_id')
            ->update(['status' => 'finished', 'winner_id' => $request->player_id]);

        if (!$updated) {
            return response()->json(['success' => false, 'message' => 'Outro agente já completou a missão.'], 409);
        }

        $player = Player::find($request->player_id);
        if ($player) $player->update(['finished_at' => now()]);

        $room = Room::where('pin', $pin)->first();
        broadcast(new MissionAccomplished($room, $player?->name ?? 'Agente'));

        return response()->json(['success' => true, 'message' => 'Vitória registrada.']);
    }

    // ─── Jogador esgotou erros — eliminação ──────────────────────────────────
    public function eliminatePlayer(Request $request, string $pin)
    {
        $player = Player::find($request->player_id);
        if ($player && !$player->finished_at) {
            $player->update(['finished_at' => now()]);
        }

        broadcast(new PlayerEliminated($pin, $request->player_id));

        return response()->json(['success' => true, 'message' => 'Agente eliminado.']);
    }

    // ─── Jogador sai da sala voluntariamente (lobby) ─────────────────────────
    public function leaveRoom(Request $request, string $pin)
    {
        $request->validate(['player_id' => 'required|integer']);

        $room   = Room::where('pin', $pin)->where('status', 'waiting')->first();
        $player = Player::find($request->player_id);

        if (!$room || !$player || $player->room_id !== $room->id) {
            return response()->json(['success' => false, 'message' => 'Sala ou jogador não encontrado.'], 404);
        }

        $wasLeader = $player->is_leader;
        $player->delete();

        // se era líder, passa a liderança para o próximo jogador ativo
        if ($wasLeader) {
            $next = $room->players()->first();
            if ($next) {
                $next->update(['is_leader' => true]);
                broadcast(new LeaderChanged($pin, $next->id, $next->name));
            }
            // se não há mais ninguém, a sala permanece em "waiting" e será reaproveitada
        }

        return response()->json(['success' => true, 'message' => 'Agente retirado da operação.']);
    }

    // ─── Jogador reporta movimento correto (para espectadores) ──────────────
    public function reportMove(Request $request, string $pin)
    {
        $request->validate([
            'player_id' => 'required|integer',
            'r'         => 'required|integer|between:0,8',
            'c'         => 'required|integer|between:0,8',
            'value'     => 'required|integer|between:1,9',
            'errors'    => 'required|integer',
            'filled'    => 'required|integer',
        ]);

        $room   = Room::where('pin', $pin)->where('status', 'playing')->first();
        $player = Player::find($request->player_id);

        if (!$room || !$player || $player->room_id !== $room->id) {
            return response()->json(['success' => false], 404);
        }

        // inicializa board_state a partir do puzzle original na primeira jogada
        $board = $player->board_state ?? $room->puzzle;
        $board[$request->r][$request->c] = $request->value;
        $player->update([
            'board_state'  => $board,
            'errors_count' => $request->errors,
            'filled_count' => $request->filled,
        ]);

        broadcast(new PlayerMoved(
            $pin,
            $player->id,
            $request->r,
            $request->c,
            $request->value,
            $request->errors,
            $request->filled,
        ));

        return response()->json(['success' => true]);
    }

    // ─── Estado atual da sala (para reconexão após F5) ───────────────────────
    public function roomState(Request $request, string $pin)
    {
        $room    = Room::where('pin', $pin)->firstOrFail();
        $players = $room->players()->get(['id', 'name', 'is_leader', 'finished_at', 'board_state', 'errors_count', 'filled_count']);

        $yourStatus = ['is_eliminated' => false, 'is_winner' => false];
        if ($request->player_id) {
            $me = $room->players()->where('id', $request->player_id)->first();
            if ($me) {
                $yourStatus['is_eliminated'] = $me->finished_at && $me->id !== $room->winner_id;
                $yourStatus['is_winner']     = $me->id === $room->winner_id;
            }
        }

        // puzzle e solution disponíveis apenas durante a partida
        $isPlaying = $room->status === 'playing';

        return response()->json([
            'success' => true,
            'data'    => [
                'room'        => [
                    'pin'           => $room->pin,
                    'status'        => $room->status,
                    'difficulty'    => $room->difficulty,
                    'players_count' => $players->count(),
                ],
                'players'     => $players->map(fn($p) => [
                    'id'            => $p->id,
                    'name'          => $p->name,
                    'is_leader'     => $p->is_leader,
                    'is_eliminated' => (bool) ($p->finished_at && $p->id !== $room->winner_id),
                    'errors_count'  => $p->errors_count ?? 0,
                    'filled_count'  => $p->filled_count ?? 0,
                    'board_state'   => $isPlaying ? $p->board_state : null,
                ]),
                'your_status' => $yourStatus,
                'puzzle'      => $isPlaying ? $room->puzzle   : null,
                'solution'    => $isPlaying ? $room->solution : null,
            ],
        ]);
    }
}

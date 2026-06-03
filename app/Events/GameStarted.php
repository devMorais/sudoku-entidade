<?php

namespace App\Events;

use App\Models\Room;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GameStarted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Room $room) {}

    public function broadcastOn(): array
    {
        return [new Channel('room.' . $this->room->pin)];
    }

    public function broadcastAs(): string
    {
        return 'GameStarted';
    }

    // Envia puzzle + solution para que todos possam jogar
    public function broadcastWith(): array
    {
        return [
            'pin'      => $this->room->pin,
            'puzzle'   => $this->room->puzzle,
            'solution' => $this->room->solution,
        ];
    }
}

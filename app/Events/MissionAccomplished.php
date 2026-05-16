<?php

namespace App\Events;

use App\Models\Room;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MissionAccomplished implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $room;
    public $winnerName;

    public function __construct(Room $room, string $winnerName)
    {
        $this->room = $room;
        $this->winnerName = $winnerName;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->room->pin),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MissionAccomplished';
    }
}

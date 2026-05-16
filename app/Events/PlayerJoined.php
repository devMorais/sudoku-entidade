<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerJoined implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public $pin;
    public $playerName;
    public $playerId;
    public function __construct($pin, $playerName, $playerId)
    {
        $this->pin = $pin;
        $this->playerName = $playerName;
        $this->playerId = $playerId;
    }

    public function broadcastOn(): array
    {
        return [new Channel('room.' . $this->pin)];
    }
}

<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerEliminated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public $pin;
    public $playerId;
    public function __construct($pin, $playerId)
    {
        $this->pin = $pin;
        $this->playerId = $playerId;
    }
    public function broadcastOn(): array
    {
        return [new Channel('room.' . $this->pin)];
    }
}

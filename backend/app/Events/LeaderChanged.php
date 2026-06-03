<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeaderChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $pin,
        public int    $newLeaderId,
        public string $newLeaderName,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel('room.' . $this->pin)];
    }

    public function broadcastAs(): string
    {
        return 'LeaderChanged';
    }
}

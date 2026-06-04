<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    protected $fillable = ['room_id', 'name', 'is_leader', 'finished_at', 'board_state', 'errors_count', 'filled_count'];

    protected $casts = ['board_state' => 'array', 'is_leader' => 'boolean'];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}

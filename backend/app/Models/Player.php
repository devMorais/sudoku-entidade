<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    protected $fillable = ['room_id', 'name', 'is_leader', 'finished_at'];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    protected $fillable = ['pin', 'puzzle', 'solution', 'status', 'winner_id'];

    protected $casts = [
        'puzzle' => 'array',
        'solution' => 'array',
    ];

    public function players(): HasMany
    {
        return $this->hasMany(Player::class);
    }
}

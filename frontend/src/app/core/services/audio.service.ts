import { Injectable } from '@angular/core';

type WaveType = OscillatorType;

interface SoundDef {
  type: WaveType;
  freq: number;
  duration: number;
  vol?: number;
}

const SFX: Record<string, SoundDef[]> = {
  type:  [{ type: 'sine',     freq: 880, duration: 0.08, vol: 0.3 }],
  error: [{ type: 'sawtooth', freq: 180, duration: 0.18, vol: 0.4 }],
  hint:  [{ type: 'sine',     freq: 660, duration: 0.12, vol: 0.3 }, { type: 'sine', freq: 880, duration: 0.12, vol: 0.3 }],
  win:   [{ type: 'sine',     freq: 523, duration: 0.15 }, { type: 'sine', freq: 659, duration: 0.15 }, { type: 'sine', freq: 784, duration: 0.25 }],
  glitch:[{ type: 'square',   freq: 200, duration: 0.05, vol: 0.2 }, { type: 'square', freq: 100, duration: 0.10, vol: 0.2 }],
};

@Injectable({ providedIn: 'root' })
export class AudioService {

  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  play(sfxName: keyof typeof SFX): void {
    if (this.muted) return;
    const defs = SFX[sfxName];
    if (!defs) return;
    let delay = 0;
    const ctx = this.ensureCtx();
    for (const def of defs) {
      this.playTone(ctx, def, delay);
      delay += def.duration + 0.02;
    }
  }

  private playTone(ctx: AudioContext, def: SoundDef, delayS: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = def.type;
    osc.frequency.setValueAtTime(def.freq, ctx.currentTime + delayS);
    gain.gain.setValueAtTime(def.vol ?? 0.35, ctx.currentTime + delayS);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delayS + def.duration);
    osc.start(ctx.currentTime + delayS);
    osc.stop(ctx.currentTime + delayS + def.duration + 0.01);
  }

  suspend(): void { this.ctx?.suspend(); }
  resume(): void  { this.ctx?.resume(); }
  toggleMute(): void { this.muted = !this.muted; }
  get isMuted(): boolean { return this.muted; }
}

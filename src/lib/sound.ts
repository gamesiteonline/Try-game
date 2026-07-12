/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Initialized lazily on first user gesture to comply with browser autoplay policies.
  }

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn("Web Audio API not supported in this environment:", e);
      }
    }
    // Resume context if suspended
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted && this.ctx) {
      this.ctx.suspend().catch(() => {});
    } else if (!this.muted && this.ctx) {
      this.ctx.resume().catch(() => {});
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Short, digital high-pitch bleep for menu clicks and navigation
   */
  playClick() {
    const ctx = this.getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn("Failed to play Click sound effect:", e);
    }
  }

  /**
   * Dynamic ascending bleeps (double-pulse) when eating food
   */
  playEat() {
    const ctx = this.getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      // Tone 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.06); // E5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tone 2 (offset)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now + 0.06); // G5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.18); // C6
      gain2.gain.setValueAtTime(0.08, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.18);
    } catch (e) {
      console.warn("Failed to play Eat sound effect:", e);
    }
  }

  /**
   * Cascade of 4 bright ascending chime tones for claiming rewards
   */
  playReward() {
    const ctx = this.getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const timeOffset = idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + timeOffset);

        gain.gain.setValueAtTime(0.08, now + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.3);
      });
    } catch (e) {
      console.warn("Failed to play Reward sound effect:", e);
    }
  }

  /**
   * Classic retro swell when starting a new round
   */
  playStart() {
    const ctx = this.getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.6);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(100, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.6);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {
      console.warn("Failed to play Start sound effect:", e);
    }
  }

  /**
   * Intense low rumble + white noise explosion when snake hits walls or self
   */
  playCrash() {
    const ctx = this.getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Low Bass Thump
      const osc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.6);

      bassGain.gain.setValueAtTime(0.2, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(bassGain);
      bassGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);

      // 2. Filtered White Noise burst
      const bufferSize = ctx.sampleRate * 0.5; // 0.5 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.linearRampToValueAtTime(50, now + 0.45);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.5);
    } catch (e) {
      console.warn("Failed to play Crash sound effect:", e);
    }
  }

  /**
   * Reward chime for unlocking custom cosmetics or topping up credits
   */
  playUnlock() {
    const ctx = this.getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major chord arpeggio

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } catch (e) {
      console.warn("Failed to play Unlock sound effect:", e);
    }
  }
}

export const sound = new SoundManager();

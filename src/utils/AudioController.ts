/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioController {
  private ctx: AudioContext | null = null;
  private shieldOscs: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;
  private isEnabled: boolean = true;

  constructor() {
    // Lazy loaded on first user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch (e) {
      console.warn("Web Audio API not supported or blocked by security policies", e);
    }
  }

  toggleSound(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopShieldHum();
    }
  }

  playThump(volumeRatio: number = 1.0) {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const time = this.ctx.currentTime;
      // Synthesize a heavy thumper beat
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(65, time);
      // Exponential frequency sweep downwards mimicking a shockwave
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.25);

      gain.gain.setValueAtTime(0.4 * volumeRatio, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.35);
    } catch (e) {
      // Squelch errors
    }
  }

  playSpiceHarvest() {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const time = this.ctx.currentTime;
      // High-frequency synth for spice sparkliness
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(900, time);
      osc1.frequency.exponentialRampToValueAtTime(1500, time + 0.15);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, time);
      osc2.frequency.exponentialRampToValueAtTime(2200, time + 0.15);

      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.22);
      osc2.stop(time + 0.22);
    } catch (e) {
      // Squelch errors
    }
  }

  startShieldHum() {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx || this.shieldOscs) return;

    try {
      const time = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      // Dissonant dual hum
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(90, time);
      
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(94.5, time); // Detuned hum

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, time);
      // LFO styled filter sweep
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 6.0; // 6 Hz resonance
      lfoGain.gain.value = 50;
      
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.06, time + 0.3); // Safe background buzz

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(time);
      osc1.start(time);
      osc2.start(time);

      this.shieldOscs = {
        osc1,
        osc2,
        gain
      };
    } catch (e) {
      // Squelch errors
    }
  }

  stopShieldHum() {
    if (!this.shieldOscs || !this.ctx) return;
    try {
      const time = this.ctx.currentTime;
      const oscs = this.shieldOscs;
      this.shieldOscs = null;

      oscs.gain.gain.cancelScheduledValues(time);
      oscs.gain.gain.setValueAtTime(oscs.gain.gain.value, time);
      oscs.gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      setTimeout(() => {
        try {
          oscs.osc1.stop();
          oscs.osc2.stop();
        } catch (e) {}
      }, 200);
    } catch (e) {
      // Squelch errors
    }
  }

  playWormRoar() {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Earth rumbling low frequency
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, time);
      osc.frequency.linearRampToValueAtTime(40, time + 0.75);

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(45, time);
      subOsc.frequency.linearRampToValueAtTime(25, time + 0.8);

      filter.type = 'lowpass';
      filter.frequency.value = 150;

      gain.gain.setValueAtTime(0.01, time);
      gain.gain.linearRampToValueAtTime(0.24, time + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      subOsc.start(time);
      osc.stop(time + 0.9);
      subOsc.stop(time + 0.9);
    } catch (e) {
      // Squelch errors
    }
  }

  playDeath() {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.linearRampToValueAtTime(55, time + 0.5);

      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.55);
    } catch (e) {
      // Squelch errors
    }
  }

  playVictory() {
    if (!this.isEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const time = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord arpeggio
      
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time + i * 0.12);

        gain.gain.setValueAtTime(0.0, time + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.08, time + i * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(time + i * 0.12);
        osc.stop(time + i * 0.12 + 0.45);
      });
    } catch (e) {
      // Squelch errors
    }
  }
}

export const audioController = new AudioController();

import { Service, signal, OnDestroy } from '@angular/core';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface AmbientBus {
  delay: DelayNode;
  feedback: GainNode;
  filter: BiquadFilterNode;
}

@Service()
export class SoundingSystem implements OnDestroy {
  private audioContext?: AudioContext;
  private windowObj = window;
  private bgIntervalId?: number;
  private ambientBus?: AmbientBus;
  private lastClickAt = -Infinity;
  private readonly clickDebounceSeconds = 0.06;
  private lastHoverAt = -Infinity;
  private readonly hoverDebounceSeconds = 0.15;
  private lastNavHoverAt = -Infinity;
  private readonly navHoverDebounceSeconds = 0.1;
  private boundPlayUIClick = () => this.playUIClick();

  audioEnabled = signal(true);

  public async initAudio(): Promise<void> {
    this.bgIntervalId = undefined;
    if (!this.audioContext) {
      const AudioContextClass = this.windowObj.AudioContext || this.windowObj.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public playUIStart(frequency: number = 440): void {
    if (this.audioContext && this.audioEnabled()) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.5);
      this.startClickMonitoring();
      this.bgMusicLoop();
    }
  }

  public playUIClick(): void {
    if (!this.audioContext || !this.audioEnabled()) return;

    const time = this.audioContext.currentTime;

    if (time - this.lastClickAt < this.clickDebounceSeconds) return;
    this.lastClickAt = time;

    const bus = this.ensureAmbientBus();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const sendGain = this.audioContext.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, time);
    filter.Q.setValueAtTime(0.4, time);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(350, time);
    oscillator.frequency.exponentialRampToValueAtTime(220, time + 0.15);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.12, time + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    sendGain.gain.setValueAtTime(0.05, time);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    gainNode.connect(sendGain);
    sendGain.connect(bus.delay);

    oscillator.start(time);
    oscillator.stop(time + 0.15);
  }

  public playHoverBlip(): void {
    if (!this.audioContext || !this.audioEnabled()) return;

    const time = this.audioContext.currentTime;

    if (time - this.lastHoverAt < this.hoverDebounceSeconds) return;
    this.lastHoverAt = time;

    const bus = this.ensureAmbientBus();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const sendGain = this.audioContext.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, time);
    filter.Q.setValueAtTime(0.3, time);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, time);
    oscillator.frequency.exponentialRampToValueAtTime(520, time + 0.06);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.05, time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    sendGain.gain.setValueAtTime(0.03, time);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    gainNode.connect(sendGain);
    sendGain.connect(bus.delay);

    oscillator.start(time);
    oscillator.stop(time + 0.08);
  }

  public playNavHoverTick(): void {
    if (!this.audioContext || !this.audioEnabled()) return;

    const time = this.audioContext.currentTime;

    if (time - this.lastNavHoverAt < this.navHoverDebounceSeconds) return;
    this.lastNavHoverAt = time;

    const bus = this.ensureAmbientBus();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const sendGain = this.audioContext.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, time);
    filter.Q.setValueAtTime(0.3, time);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.025, time + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    sendGain.gain.setValueAtTime(0.015, time);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    gainNode.connect(sendGain);
    sendGain.connect(bus.delay);

    oscillator.start(time);
    oscillator.stop(time + 0.06);
  }

  public playAudioToggle(): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const time = ctx.currentTime;
    const bus = this.ensureAmbientBus();

    const duration = 0.22;
    const startFreq = this.audioEnabled() ? 130 : 260;
    const endFreq = this.audioEnabled() ? 260 : 130;
    const startCutoff = this.audioEnabled() ? 400 : 900;
    const endCutoff = this.audioEnabled() ? 900 : 400;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(startFreq, time);
    oscillator.frequency.linearRampToValueAtTime(endFreq, time + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(startCutoff, time);
    filter.frequency.linearRampToValueAtTime(endCutoff, time + duration);
    filter.Q.setValueAtTime(0.4, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.08, time + duration * 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.connect(bus.delay);

    oscillator.start(time);
    oscillator.stop(time + duration + 0.05);
  }

  public playCameraTransition(durationSeconds: number = 1.2, direction: 'in' | 'out' = 'in'): void {
    if (!this.audioContext || !this.audioEnabled()) return;

    const ctx = this.audioContext;
    const time = ctx.currentTime;
    const bus = this.ensureAmbientBus();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    const startFreq = direction === 'in' ? 140 : 260;
    const endFreq = direction === 'in' ? 260 : 140;
    const startCutoff = direction === 'in' ? 250 : 900;
    const endCutoff = direction === 'in' ? 900 : 250;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(startFreq, time);
    oscillator.frequency.linearRampToValueAtTime(endFreq, time + durationSeconds);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(startCutoff, time);
    filter.frequency.linearRampToValueAtTime(endCutoff, time + durationSeconds);
    filter.Q.setValueAtTime(0.4, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.045, time + durationSeconds * 0.4);
    gainNode.gain.linearRampToValueAtTime(0, time + durationSeconds);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.connect(bus.delay);

    oscillator.start(time);
    oscillator.stop(time + durationSeconds + 0.1);
  }

  public playMonitorPower(state: 'on' | 'off'): void {
    if (!this.audioContext || !this.audioEnabled()) return;

    const ctx = this.audioContext;
    const time = ctx.currentTime;
    const bus = this.ensureAmbientBus();

    const duration = state === 'on' ? 0.5 : 0.35;
    const startFreq = state === 'on' ? 110 : 330;
    const endFreq = state === 'on' ? 330 : 90;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(startFreq, time);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.setValueAtTime(0.5, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.09, time + duration * 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.connect(bus.delay);

    oscillator.start(time);
    oscillator.stop(time + duration + 0.05);
  }

  public playLightsPower(state: 'on' | 'off'): void {
    if (!this.audioContext || !this.audioEnabled()) return;

    const ctx = this.audioContext;
    const time = ctx.currentTime;
    const bus = this.ensureAmbientBus();

    const duration = 0.12; 
    const startFreq = state === 'on' ? 400 : 900;
    const endFreq = state === 'on' ? 1200 : 250;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(startFreq, time);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(state === 'on' ? 1000 : 400, time);
    filter.Q.setValueAtTime(1.2, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.06, time + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    const sendGain = ctx.createGain();
    sendGain.gain.setValueAtTime(0.02, time);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    gainNode.connect(sendGain);
    sendGain.connect(bus.delay);

    oscillator.start(time);
    oscillator.stop(time + duration + 0.05);
  }

  public playTypingSound(): void {
    if (!this.audioContext || !this.audioEnabled()) return;

    const ctx = this.audioContext;
    const time = ctx.currentTime;
    const bus = this.ensureAmbientBus();

    const pitchJitter = Math.random() * 300 - 150;
    const duration = 0.04 + Math.random() * 0.02;
    const startFreq = 900 + pitchJitter;
    const endFreq = 250 + pitchJitter * 0.5;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(startFreq, time);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, time + 0.015);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800 + pitchJitter, time);
    filter.Q.setValueAtTime(1.5, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.07, time + 0.003);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    const sendGain = ctx.createGain();
    sendGain.gain.setValueAtTime(0.008, time);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    gainNode.connect(sendGain);
    sendGain.connect(bus.delay);

    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  public bgMusicLoop(): void {
    if (!this.audioContext || !this.audioEnabled() || this.bgIntervalId) {
      return;
    }
    const ctx = this.audioContext;
    const scale = [98.0, 116.54, 146.83, 174.61, 196.0, 220.0];
    const coreNotes = [98.0, 146.83, 196.0];
    const bus = this.ensureAmbientBus();

    const scheduleNote = () => {
      if (!this.audioContext || !this.audioEnabled()) return;

      const isCore = Math.random() < 0.35;
      const freq = isCore
        ? coreNotes[Math.floor(Math.random() * coreNotes.length)]
        : scale[Math.floor(Math.random() * scale.length)];

      const now = ctx.currentTime;
      const noteDuration = 5 + Math.random() * 4;
      const attack = 1.8 + Math.random() * 1.2;

      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + Math.random() * 150, now);
      filter.Q.setValueAtTime(0.3, now);

      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.random() * 1.4 - 0.7, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.04, now + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);

      [0, 5].forEach((detune) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detune, now);
        osc.connect(filter);
        osc.start(now);
        osc.stop(now + noteDuration);
      });

      filter.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(ctx.destination);
      panner.connect(bus.delay);

      const nextIn = (3 + Math.random() * 4) * 1000;
      this.bgIntervalId = this.windowObj.setTimeout(scheduleNote, nextIn);
    };

    scheduleNote();
  }

  private ensureAmbientBus(): AmbientBus {
    if (this.ambientBus) return this.ambientBus;

    const ctx = this.audioContext as AudioContext;
    const delay = ctx.createDelay(2.0);
    delay.delayTime.setValueAtTime(0.6, ctx.currentTime);
    const feedback = ctx.createGain();
    feedback.gain.setValueAtTime(0.35, ctx.currentTime);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);

    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(delay);
    delay.connect(ctx.destination);

    this.ambientBus = { delay, feedback, filter };
    return this.ambientBus;
  }

  private startClickMonitoring() {
    this.windowObj.addEventListener('click', this.boundPlayUIClick);
  }

  public ngOnDestroy(): void {
    this.windowObj.removeEventListener('click', this.boundPlayUIClick);
    if (this.bgIntervalId) {
      this.windowObj.clearTimeout(this.bgIntervalId);
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

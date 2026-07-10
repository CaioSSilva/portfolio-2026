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

  public bgMusicLoop(): void {
    if (!this.audioContext || !this.audioEnabled() || this.bgIntervalId) {
      return;
    }
    const ctx = this.audioContext;
    const scale = [196.0, 233.08, 293.66, 349.23, 392.0, 440.0];
    const coreNotes = [196.0, 293.66, 392.0];
    const bus = this.ensureAmbientBus();

    const scheduleNote = () => {
      if (!this.audioContext || !this.audioEnabled()) return;

      const isCore = Math.random() < 0.35;
      const freq = isCore
        ? coreNotes[Math.floor(Math.random() * coreNotes.length)]
        : scale[Math.floor(Math.random() * scale.length)];

      const now = ctx.currentTime;
      const noteDuration = 4 + Math.random() * 4;
      const attack = 1.5 + Math.random() * 1.0;

      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700 + Math.random() * 400, now);
      filter.Q.setValueAtTime(0.3, now);

      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.random() * 1.4 - 0.7, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.035, now + attack);
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

      const nextIn = (2.5 + Math.random() * 3.5) * 1000;
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
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

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
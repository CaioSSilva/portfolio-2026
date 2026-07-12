import { inject, Injectable, signal } from '@angular/core';
import { SoundingSystem } from './sounding-system';
import { Recorder, ViolinVoice } from './violin-controllers';
import { BodyResonator, BowNoise } from './violin-nodes';

@Injectable({ providedIn: 'root' })
export class Violin {
  isVisible = signal(false);
  isRecording = signal(false);
  isPaused = signal(false);
  recordFinished = signal(false);

  activeKey = signal<string | null>(null);
  isMouseDown = signal(false);
  shiftPressed = signal(false);
  bowPhysics = signal({ velocity: 0, direction: 1, position: 0 });

  audio = inject(SoundingSystem);

  private ctx!: AudioContext;
  private masterGain!: GainNode;
  private compressor!: DynamicsCompressorNode;
  private audioDestination!: MediaStreamAudioDestinationNode;
  private recorder!: Recorder;

  private voices: Map<string, ViolinVoice> = new Map();
  private bowNoise!: BowNoise;
  private bodyResonator!: BodyResonator;

  private readonly STRINGS: Record<string, number> = {
    '1': 196.0,
    '2': 293.66,
    '3': 440.0,
    '4': 659.25,
  };

  private mouseStopTimeout: any;
  private lastMouseX: number | null = null;
  private lastMouseY: number | null = null;

  public show() {
    this.isVisible.set(true);
    this.audio.audioEnabled.set(false);
    this.initAudio();
    this.attachListeners();
  }

  public hide() {
    this.isVisible.set(false);
    this.audio.audioEnabled.set(true);
    this.stopNote();
    this.removeListeners();
    this.stopRecording();
  }

  private initAudio() {
    if (this.ctx) return;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.bodyResonator = new BodyResonator(this.ctx);
    this.bowNoise = new BowNoise(this.ctx);

    this.bodyResonator.output.connect(this.compressor);
    this.bowNoise.output.connect(this.bodyResonator.input);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.audioDestination = this.ctx.createMediaStreamDestination();
    this.masterGain.connect(this.audioDestination);
    this.recorder = new Recorder(this.audioDestination, () => {
      this.recordFinished.set(true);
      this.isRecording.set(false);
    });

    Object.entries(this.STRINGS).forEach(([key, freq]) => {
      const voice = new ViolinVoice(this.ctx, freq);
      voice.output.connect(this.bodyResonator.input);
      this.voices.set(key, voice);
    });
  }

  public pressNote(key: string) {
    if (!this.STRINGS[key] || this.activeKey() === key) return;

    if (this.activeKey()) this.releaseNote(this.activeKey()!);

    this.activeKey.set(key);

    const voice = this.voices.get(key);
    if (voice) voice.play();
  }

  public releaseNote(key: string) {
    if (this.activeKey() === key) {
      const voice = this.voices.get(key);
      if (voice) voice.release();
      this.activeKey.set(null);
    }
  }

  public updateBowIntensity(velocityY: number) {
    const currentKey = this.activeKey();
    if (!currentKey || !this.ctx) return;

    const voice = this.voices.get(currentKey);
    if (!voice) return;

    const speed = velocityY === 0 ? 0 : Math.min(Math.abs(velocityY) / 50, 1.0);
    const pressure = this.isMouseDown() ? 1.5 : 0.5;
    const shift = this.shiftPressed();
    const posX = this.lastMouseX ?? window.innerWidth / 2;

    voice.updateExpression(speed, pressure, posX, shift, 0);
    this.bowNoise.updateIntensity(speed, pressure, this.ctx.currentTime);
  }

  public stopNote() {
    const currentKey = this.activeKey();
    if (currentKey) {
      this.releaseNote(currentKey);
    }
    this.bowPhysics.update((p) => ({ ...p, velocity: 0 }));
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isVisible() || e.repeat) return;
    if (e.key === 'Shift') this.shiftPressed.set(true);
    if (this.STRINGS[e.key]) this.pressNote(e.key);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!this.isVisible()) return;
    if (e.key === 'Shift') this.shiftPressed.set(false);
    if (this.STRINGS[e.key]) this.releaseNote(e.key);
  };

  private handleMouseDown = () => this.isMouseDown.set(true);
  private handleMouseUp = () => this.isMouseDown.set(false);

  private handleMouseMove = (e: MouseEvent) => {
    const currentKey = this.activeKey();
    if (!this.isVisible() || !currentKey) return;

    if (this.lastMouseY === null || this.lastMouseX === null) {
      this.lastMouseY = e.clientY;
      this.lastMouseX = e.clientX;
      return;
    }

    const deltaY = e.clientY - this.lastMouseY;
    const deltaX = e.clientX - this.lastMouseX;

    const velocity = Math.abs(deltaY);
    const direction = deltaY > 0 ? 1 : -1;

    const currentPos = this.bowPhysics().position;
    let newPosition = currentPos + velocity * direction * 0.005;
    newPosition = Math.max(-1.5, Math.min(newPosition, 1.5));

    this.bowPhysics.set({ velocity, direction, position: newPosition });

    this.updateBowIntensity(velocity);

    if (this.shiftPressed()) {
      const voice = this.voices.get(currentKey);
      const pressure = this.isMouseDown() ? 1.5 : 0.5;
      if (voice)
        voice.updateExpression(Math.min(velocity / 50, 1.0), pressure, e.clientX, true, deltaX);
    }

    this.lastMouseY = e.clientY;
    this.lastMouseX = e.clientX;

    clearTimeout(this.mouseStopTimeout);
    this.mouseStopTimeout = setTimeout(() => {
      this.updateBowIntensity(0);
      this.bowPhysics.update((p) => ({ ...p, velocity: 0 }));
      this.lastMouseY = null;
      this.lastMouseX = null;
    }, 50);
  };

  private attachListeners() {
    this.lastMouseY = null;
    this.lastMouseX = null;
    this.shiftPressed.set(false);
    this.isMouseDown.set(false);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  private removeListeners() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  public startRecording() {
    if (!this.ctx) this.initAudio();
    this.isRecording.set(true);
    this.recordFinished.set(false);
    this.recorder.start();
  }

  public stopRecording() {
    if (this.isRecording()) {
      this.recorder.stop();
    }
  }

  public downloadRecording() {
    this.recorder.download();
  }
}

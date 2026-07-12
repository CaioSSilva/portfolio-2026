import { inject, signal, Service } from '@angular/core';
import { SoundingSystem } from './sounding-system';
import { Recorder, ViolinVoice } from './violin-controllers';
import { BodyResonator, BowNoise } from './violin-nodes';

interface MouseMoveDelta {
  deltaY: number;
  deltaX: number;
  clientX: number;
}

const MOUSE_STOP_DELAY_MS = 50;
const MAX_BOW_TRAVEL = 1.5;
const BOW_POSITION_SENSITIVITY = 0.005;

@Service()
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
    this.createSignalChain();
    this.createRecordingBranch();
    this.createVoices();
  }

  private createSignalChain() {
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.compressor = this.createCompressor();
    this.bodyResonator = new BodyResonator(this.ctx);
    this.bowNoise = new BowNoise(this.ctx);
    this.bodyResonator.output.connect(this.compressor);
    this.bowNoise.output.connect(this.bodyResonator.input);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  private createCompressor(): DynamicsCompressorNode {
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    return compressor;
  }

  private createRecordingBranch() {
    this.audioDestination = this.ctx.createMediaStreamDestination();
    this.masterGain.connect(this.audioDestination);
    this.recorder = new Recorder(this.audioDestination, () => {
      this.recordFinished.set(true);
      this.isRecording.set(false);
    });
  }

  private createVoices() {
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
    this.voices.get(key)?.play();
  }

  public releaseNote(key: string) {
    if (this.activeKey() !== key) return;
    this.voices.get(key)?.release();
    this.activeKey.set(null);
  }

  public updateBowIntensity(
    velocityY: number,
    shiftKey = false,
    positionX?: number,
    mouseDx = 0,
  ) {
    const currentKey = this.activeKey();
    if (!currentKey || !this.ctx) return;
    const voice = this.voices.get(currentKey);
    if (!voice) return;
    const speed = this.computeSpeed(velocityY);
    const pressure = this.computePressure();
    const posX = positionX ?? this.lastMouseX ?? window.innerWidth / 2;
    voice.updateExpression(speed, pressure, posX, shiftKey, mouseDx);
    this.bowNoise.updateIntensity(speed, pressure, this.ctx.currentTime);
  }

  private computeSpeed(velocityY: number): number {
    return velocityY === 0 ? 0 : Math.min(Math.abs(velocityY) / 50, 1.0);
  }

  private computePressure(): number {
    return this.isMouseDown() ? 1.5 : 0.5;
  }

  public stopNote() {
    const currentKey = this.activeKey();
    if (currentKey) this.releaseNote(currentKey);
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
    if (!this.isVisible() || !this.activeKey()) return;
    if (this.lastMouseX === null || this.lastMouseY === null) {
      this.recordMousePosition(e);
      return;
    }
    const delta = this.computeMouseDelta(e);
    this.applyBowMotion(delta);
    this.recordMousePosition(e);
    this.scheduleMouseStop();
  };

  private computeMouseDelta(e: MouseEvent): MouseMoveDelta {
    return {
      deltaY: e.clientY - this.lastMouseY!,
      deltaX: e.clientX - this.lastMouseX!,
      clientX: e.clientX,
    };
  }

  private applyBowMotion(delta: MouseMoveDelta) {
    const velocity = Math.abs(delta.deltaY);
    const direction = delta.deltaY > 0 ? 1 : -1;
    const newPosition = this.computeBowPosition(velocity, direction);
    this.bowPhysics.set({ velocity, direction, position: newPosition });
    const shiftKey = this.shiftPressed();
    this.updateBowIntensity(velocity, shiftKey, delta.clientX, shiftKey ? delta.deltaX : 0);
  }

  private computeBowPosition(velocity: number, direction: number): number {
    const currentPos = this.bowPhysics().position;
    const raw = currentPos + velocity * direction * BOW_POSITION_SENSITIVITY;
    return Math.max(-MAX_BOW_TRAVEL, Math.min(raw, MAX_BOW_TRAVEL));
  }

  private recordMousePosition(e: MouseEvent) {
    this.lastMouseY = e.clientY;
    this.lastMouseX = e.clientX;
  }

  private scheduleMouseStop() {
    clearTimeout(this.mouseStopTimeout);
    this.mouseStopTimeout = setTimeout(() => this.resetBowState(), MOUSE_STOP_DELAY_MS);
  }

  private resetBowState() {
    this.updateBowIntensity(0);
    this.bowPhysics.update((p) => ({ ...p, velocity: 0 }));
    this.lastMouseY = null;
    this.lastMouseX = null;
  }

  private eventPairs(): [string, EventListener][] {
    return [
      ['keydown', this.handleKeyDown as EventListener],
      ['keyup', this.handleKeyUp as EventListener],
      ['mousemove', this.handleMouseMove as EventListener],
      ['mousedown', this.handleMouseDown as EventListener],
      ['mouseup', this.handleMouseUp as EventListener],
    ];
  }

  private attachListeners() {
    this.lastMouseY = null;
    this.lastMouseX = null;
    this.shiftPressed.set(false);
    this.isMouseDown.set(false);
    this.eventPairs().forEach(([type, handler]) => document.addEventListener(type, handler));
  }

  private removeListeners() {
    clearTimeout(this.mouseStopTimeout);
    this.eventPairs().forEach(([type, handler]) => document.removeEventListener(type, handler));
  }

  public startRecording() {
    if (!this.ctx) this.initAudio();
    this.isRecording.set(true);
    this.recordFinished.set(false);
    this.recorder.start();
  }

  public stopRecording() {
    if (this.isRecording()) this.recorder.stop();
  }

  public downloadRecording() {
    this.recorder.download();
  }
}
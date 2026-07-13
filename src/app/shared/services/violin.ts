import { inject, signal, Service } from '@angular/core';
import { SoundingSystem } from './sounding-system';
import { Recorder, ViolinVoice } from './violin-controllers';
import { BodyResonator, BowNoise, RoomReverb } from './violin-nodes';

interface MouseMoveDelta {
  deltaY: number;
  deltaX: number;
  clientX: number;
}

const MOUSE_STOP_DELAY_MS = 50;
const MAX_BOW_TRAVEL = 1.5;
const BOW_POSITION_SENSITIVITY = 0.005;
const BOW_VELOCITY_SCALE = 50;
const MAX_BOW_SPEED = 1.0;
const PRESSED_PRESSURE = 1.5;
const RELEASED_PRESSURE = 0.5;

@Service()
export class Violin {
  isVisible = signal(false);
  isRecording = signal(false);
  isPaused = signal(false);
  recordFinished = signal(false);
  activeKeys = signal<Set<string>>(new Set());
  isMouseDown = signal(false);
  shiftPressed = signal(false);
  altPressed = signal(false);
  midiConnected = signal(false);
  midiError = signal<string | null>(null);
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
  private reverb!: RoomReverb;

  private readonly STRINGS: Record<string, number> = {
    '1': 196.0,
    '2': 293.66,
    '3': 440.0,
    '4': 659.25,
  };

  private readonly CODE_TO_STRING: Record<string, string> = {
    Digit1: '1',
    Digit2: '2',
    Digit3: '3',
    Digit4: '4',
  };

  private mouseStopTimeout: any;
  private lastMouseX: number | null = null;
  private lastMouseY: number | null = null;

  public show() {
    this.isVisible.set(true);
    this.audio.audioEnabled.set(false);
    this.audio.stopBgMusic();
    this.initAudio();
    this.attachListeners();
  }

  public hide() {
    this.isVisible.set(false);
    this.audio.audioEnabled.set(true);
    this.audio.bgMusicLoop();
    this.stopNote();
    this.removeListeners();
    this.stopRecording();
  }

  public pressNote(key: string, pizzicato = false) {
    if (!this.STRINGS[key] || this.activeKeys().has(key)) return;

    this.activeKeys.update((keys) => {
      const nextKeys = new Set(keys);
      nextKeys.add(key);
      return nextKeys;
    });

    this.voices.get(key)?.play(pizzicato);

    if (!pizzicato) {
      this.warmUpBowState();
    }
  }

  public releaseNote(key: string, fast = false) {
    if (!this.activeKeys().has(key)) return;

    const voice = this.voices.get(key);
    voice?.release(fast);
    if (this.ctx) voice?.resetPitch(this.ctx.currentTime);

    this.activeKeys.update((keys) => {
      const nextKeys = new Set(keys);
      nextKeys.delete(key);
      return nextKeys;
    });

    if (this.activeKeys().size === 0 && this.ctx && this.bowNoise) {
      this.bowNoise.updateIntensity(0, 0, this.ctx.currentTime);
    }
  }

  public updateBowIntensity(velocityY: number, shiftKey = false, positionX?: number, mouseDx = 0) {
    const keys = this.activeKeys();
    if (keys.size === 0 || !this.ctx) return;

    const speed = this.computeSpeed(velocityY);
    const pressure = this.computePressure();
    const posX = positionX ?? this.lastMouseX ?? window.innerWidth / 2;

    let anyBowed = false;

    keys.forEach((key) => {
      const voice = this.voices.get(key);
      if (voice) {
        voice.updateExpression(speed, pressure, posX, shiftKey, mouseDx);
        if (!voice.isPizzicato) anyBowed = true;
      }
    });

    if (anyBowed) {
      this.bowNoise.updateIntensity(speed, pressure, this.ctx.currentTime);
    } else {
      this.bowNoise.updateIntensity(0, 0, this.ctx.currentTime);
    }
  }

  public stopNote() {
    const keys = this.activeKeys();
    keys.forEach((key) => this.releaseNote(key));
    this.bowPhysics.update((p) => ({ ...p, velocity: 0 }));
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

  private initAudio() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.createSignalChain();
    this.createRecordingBranch();
    this.createVoices();
    this.initMIDI();
  }

  private createSignalChain() {
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.compressor = this.createCompressor();
    this.bodyResonator = new BodyResonator(this.ctx);
    this.bowNoise = new BowNoise(this.ctx);
    this.reverb = new RoomReverb(this.ctx);

    this.bodyResonator.output.connect(this.compressor);
    this.bowNoise.output.connect(this.bodyResonator.input);

    this.compressor.connect(this.reverb.input);
    this.reverb.output.connect(this.masterGain);

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

  private initMIDI() {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        (midiAccess) => {
          this.midiError.set(null);

          const attachInputs = () => {
            if (midiAccess.inputs.size === 0) {
              this.midiConnected.set(false);
            }

            for (const input of midiAccess.inputs.values()) {
              input.onmidimessage = (e: any) => this.handleMIDIMessage(e);
            }
          };

          attachInputs();
          midiAccess.onstatechange = () => attachInputs();
        },
        () => this.midiError.set('violinUi.midiError.denied'),
      );
    } else {
      this.midiError.set('violinUi.midiError.unsupported');
    }

    setTimeout(() => {
      this.midiError.set(null);
    }, 8000);
  }

  private handleMIDIMessage(event: any) {
    if (!this.isVisible() || !this.ctx) return;
    const [status, note, velocity] = event.data;
    const command = status >> 4;

    if (command === 9 || command === 8) {
      if (!this.midiConnected()) this.midiConnected.set(true);
    }

    if (command === 9 && velocity > 0) {
      this.playMIDINote(note, velocity);
    } else if (command === 8 || (command === 9 && velocity === 0)) {
      this.releaseNote(`m${note}`);
    }
  }

  private playMIDINote(note: number, velocity: number) {
    const key = `m${note}`;
    if (this.activeKeys().has(key)) return;

    if (!this.voices.has(key)) {
      const freq = 440 * Math.pow(2, (note - 69) / 12);
      const voice = new ViolinVoice(this.ctx, freq);
      voice.output.connect(this.bodyResonator.input);
      this.voices.set(key, voice);
    }

    this.activeKeys.update((keys) => {
      const nextKeys = new Set(keys);
      nextKeys.add(key);
      return nextKeys;
    });

    const voice = this.voices.get(key)!;
    const pizzicato = this.altPressed();
    voice.play(pizzicato);

    if (!pizzicato) {
      const speed = Math.max(0.15, (velocity / 127) * MAX_BOW_SPEED);
      voice.updateExpression(
        speed,
        PRESSED_PRESSURE,
        window.innerWidth / 2,
        this.shiftPressed(),
        0,
      );
      this.bowNoise.updateIntensity(speed, PRESSED_PRESSURE, this.ctx.currentTime);
    }
  }

  private warmUpBowState() {
    const { velocity } = this.bowPhysics();
    this.updateBowIntensity(velocity, this.shiftPressed());
  }

  private computeSpeed(velocityY: number): number {
    return Math.min(Math.abs(velocityY) / BOW_VELOCITY_SCALE, MAX_BOW_SPEED);
  }

  private computePressure(): number {
    return this.isMouseDown() ? PRESSED_PRESSURE : RELEASED_PRESSURE;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isVisible() || e.repeat) return;

    if (e.key === 'Shift') this.shiftPressed.set(true);
    if (e.key === 'Alt') {
      e.preventDefault();
      this.altPressed.set(true);
    }

    const stringKey = this.CODE_TO_STRING[e.code];
    if (stringKey) this.pressNote(stringKey, this.altPressed());
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!this.isVisible()) return;

    if (e.key === 'Shift') {
      this.shiftPressed.set(false);
      if (this.ctx) {
        const time = this.ctx.currentTime;
        this.activeKeys().forEach((key) => this.voices.get(key)?.resetPitch(time));
      }
    }

    if (e.key === 'Alt') this.altPressed.set(false);

    const stringKey = this.CODE_TO_STRING[e.code];
    if (stringKey) this.releaseNote(stringKey);
  };

  private handleMouseDown = () => this.isMouseDown.set(true);
  private handleMouseUp = () => this.isMouseDown.set(false);

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isVisible() || this.activeKeys().size === 0) return;

    if (this.lastMouseX === null || this.lastMouseY === null) {
      this.recordMousePosition(e);
      return;
    }

    const delta = this.computeMouseDelta(e);
    this.applyBowMotion(delta);
    this.recordMousePosition(e);
    this.scheduleMouseStop();
  };

  private readonly listeners: [string, EventListener][] = [
    ['keydown', this.handleKeyDown as EventListener],
    ['keyup', this.handleKeyUp as EventListener],
    ['mousemove', this.handleMouseMove as EventListener],
    ['mousedown', this.handleMouseDown as EventListener],
    ['mouseup', this.handleMouseUp as EventListener],
  ];

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

  private attachListeners() {
    this.lastMouseY = null;
    this.lastMouseX = null;
    this.shiftPressed.set(false);
    this.altPressed.set(false);
    this.isMouseDown.set(false);
    this.listeners.forEach(([type, handler]) => document.addEventListener(type, handler));
  }

  private removeListeners() {
    clearTimeout(this.mouseStopTimeout);
    this.listeners.forEach(([type, handler]) => document.removeEventListener(type, handler));
  }
}

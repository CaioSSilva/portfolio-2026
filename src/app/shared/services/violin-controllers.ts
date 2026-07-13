import { HarmonicGenerator, Envelope } from './violin-nodes';

const BOW_GAIN_SMOOTHING = 0.05;
const PITCH_SHIFT_SENSITIVITY = 0.001;
const MIN_SPEED_THRESHOLD = 0.01;
const RECORDING_MIME_TYPE = 'audio/webm';
const RECORDING_FILENAME = 'violin-recording.webm';

export class ViolinVoice {
  private static readonly MAX_VIBRATO_RATIO = 0.006;
  private static readonly MAX_PRESSURE_REFERENCE = 1.5;
  private static readonly MIN_PRESSURE_FACTOR = 0.7;
  private static readonly QUICK_BOW_RELEASE_SMOOTHING = 0.03;

  public output: GainNode;
  public baseFreq: number;

  private bowGain: GainNode;
  private harmonics: HarmonicGenerator;
  private env: Envelope;
  private originalFreq: number;

  constructor(
    private ctx: AudioContext,
    freq: number,
  ) {
    this.baseFreq = freq;
    this.originalFreq = freq;
    this.output = this.ctx.createGain();
    this.output.gain.value = 0;
    this.bowGain = this.ctx.createGain();
    this.bowGain.gain.value = 0;
    this.harmonics = new HarmonicGenerator(ctx, freq);
    this.env = new Envelope(ctx, this.output.gain);
    this.harmonics.output.connect(this.bowGain);
    this.bowGain.connect(this.output);
  }

  public play() {
    this.env.triggerAttack();
    this.bowGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bowGain.gain.setValueAtTime(0, this.ctx.currentTime);
  }

  public release(fast = false) {
    this.env.triggerRelease(fast);
    const timeConstant = fast ? ViolinVoice.QUICK_BOW_RELEASE_SMOOTHING : BOW_GAIN_SMOOTHING;
    this.bowGain.gain.setTargetAtTime(0, this.ctx.currentTime, timeConstant);
  }

  public updateExpression(
    speed: number,
    pressure: number,
    positionX: number,
    shiftKey: boolean,
    mouseDx: number,
  ) {
    const t = this.ctx.currentTime;
    const finalSpeed = this.normalizeSpeed(speed);
    const pressureFactor = this.normalizePressure(pressure);
    this.applyBowGain(finalSpeed, pressureFactor, t);
    this.harmonics.updateBrightness(finalSpeed * pressureFactor, t);
    this.applyPitchShift(shiftKey, mouseDx, t);
    this.applyVibratoFromPosition(positionX, finalSpeed, t);
  }

  public resetPitch(time: number) {
    if (this.baseFreq !== this.originalFreq) {
      this.baseFreq = this.originalFreq;
      this.harmonics.setFrequency(this.originalFreq, time);
    }
  }

  private normalizeSpeed(speed: number): number {
    return speed < MIN_SPEED_THRESHOLD ? 0 : speed;
  }

  private normalizePressure(pressure: number): number {
    const ratio = Math.min(pressure / ViolinVoice.MAX_PRESSURE_REFERENCE, 1);
    return ViolinVoice.MIN_PRESSURE_FACTOR + (1 - ViolinVoice.MIN_PRESSURE_FACTOR) * ratio;
  }

  private applyBowGain(speed: number, pressureFactor: number, time: number) {
    this.bowGain.gain.setTargetAtTime(speed * pressureFactor, time, BOW_GAIN_SMOOTHING);
  }

  private applyPitchShift(shiftKey: boolean, mouseDx: number, time: number) {
    if (!shiftKey) {
      this.resetPitch(time);
      return;
    }
    if (mouseDx === 0) return;
    this.baseFreq *= 1 + mouseDx * PITCH_SHIFT_SENSITIVITY;
    this.harmonics.setFrequency(this.baseFreq, time);
  }

  private applyVibratoFromPosition(positionX: number, speed: number, time: number) {
    const normalizedPos = Math.max(0, Math.min(positionX / window.innerWidth, 1));
    const depthHz = this.baseFreq * ViolinVoice.MAX_VIBRATO_RATIO * normalizedPos * speed;
    this.harmonics.applyVibrato(depthHz, time);
  }
}

export class Recorder {
  private mediaRecorder!: MediaRecorder;
  private recordedChunks: Blob[] = [];

  constructor(
    private dest: MediaStreamAudioDestinationNode,
    private onStopCallback: () => void,
  ) {}

  public start() {
    this.recordedChunks = [];
    this.mediaRecorder = this.createMediaRecorder();
    this.mediaRecorder.start();
  }

  public stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  public download() {
    if (this.recordedChunks.length === 0) return;
    this.triggerDownload(this.buildBlob());
  }

  private createMediaRecorder(): MediaRecorder {
    const recorder = new MediaRecorder(this.dest.stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    recorder.onstop = this.onStopCallback;
    return recorder;
  }

  private buildBlob(): Blob {
    return new Blob(this.recordedChunks, { type: RECORDING_MIME_TYPE });
  }

  private triggerDownload(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = RECORDING_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  }
}
import { HarmonicGenerator, Envelope } from './violin-nodes';

export class ViolinVoice {
  public output: GainNode;
  private bowGain: GainNode;
  private harmonics: HarmonicGenerator;
  private env: Envelope;
  public baseFreq: number;

  constructor(
    private ctx: AudioContext,
    freq: number,
  ) {
    this.baseFreq = freq;
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

  public release() {
    this.env.triggerRelease();
    this.bowGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  public updateExpression(
    speed: number,
    _pressure: number,
    positionX: number,
    shiftKey: boolean,
    mouseDx: number,
  ) {
    const t = this.ctx.currentTime;
    const finalSpeed = this.normalizeSpeed(speed);
    this.applyBowGain(finalSpeed, t);
    this.harmonics.updateBrightness(finalSpeed, t);
    this.applyPitchShift(shiftKey, mouseDx, t);
    this.applyVibratoFromPosition(positionX, t);
  }

  private normalizeSpeed(speed: number): number {
    return speed < 0.01 ? 0 : speed;
  }

  private applyBowGain(speed: number, time: number) {
    this.bowGain.gain.setTargetAtTime(speed, time, 0.05);
  }

  private applyPitchShift(shiftKey: boolean, mouseDx: number, time: number) {
    if (!shiftKey || mouseDx === 0) return;
    this.baseFreq *= 1 + mouseDx * 0.001;
    this.harmonics.setFrequency(this.baseFreq, time);
  }

  private applyVibratoFromPosition(positionX: number, time: number) {
    const normalizedPos = Math.max(0, Math.min(positionX / window.innerWidth, 1));
    this.harmonics.applyVibrato(normalizedPos * 5, time);
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

  private createMediaRecorder(): MediaRecorder {
    const recorder = new MediaRecorder(this.dest.stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    recorder.onstop = this.onStopCallback;
    return recorder;
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

  private buildBlob(): Blob {
    return new Blob(this.recordedChunks, { type: 'audio/webm' });
  }
  
  private triggerDownload(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'violin-recording.webm';
    a.click();
    URL.revokeObjectURL(url);
  }
}
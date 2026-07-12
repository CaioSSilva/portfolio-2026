import { HarmonicGenerator, Envelope, Vibrato } from './violin-nodes';

export class ViolinVoice {
  public output: GainNode;
  private bowGain: GainNode;
  private harmonics: HarmonicGenerator;
  private env: Envelope;
  private vibrato: Vibrato;
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

    const fundamentalOsc = (this.harmonics as any).oscillators[0];
    this.vibrato = new Vibrato(ctx, fundamentalOsc.frequency, freq);

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
    pressure: number,
    positionX: number,
    shiftKey: boolean,
    mouseDx: number,
  ) {
    const t = this.ctx.currentTime;

    const finalSpeed = speed < 0.01 ? 0 : speed;

    this.bowGain.gain.setTargetAtTime(finalSpeed, t, 0.05);

    this.harmonics.updateBrightness(finalSpeed, t);

    if (shiftKey && mouseDx !== 0) {
      this.baseFreq *= 1 + mouseDx * 0.001;
      this.harmonics.setFrequency(this.baseFreq, t);
    }

    const normalizedPos = Math.max(0, Math.min(positionX / window.innerWidth, 1));
    this.vibrato.setIntensity(normalizedPos * 5, t);
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
    this.mediaRecorder = new MediaRecorder(this.dest.stream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.mediaRecorder.onstop = this.onStopCallback;
    this.mediaRecorder.start();
  }

  public stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  public download() {
    if (this.recordedChunks.length === 0) return;

    const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'violin-recording.webm';
    a.click();

    URL.revokeObjectURL(url);
  }
}

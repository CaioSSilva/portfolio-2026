export class HarmonicGenerator {
  public output: GainNode;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private readonly HARMONIC_VOLUMES = [1, 0.55, 0.35, 0.2, 0.12, 0.08];

  constructor(
    private ctx: AudioContext,
    private baseFreq: number,
  ) {
    this.output = this.ctx.createGain();
    this.output.gain.value = 1;
    this.initNodes();
  }

  private initNodes() {
    this.HARMONIC_VOLUMES.forEach((vol, index) => {
      const osc = this.ctx.createOscillator();
      osc.type = index === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = this.baseFreq * (index + 1);

      const gain = this.ctx.createGain();
      gain.gain.value = vol;

      osc.connect(gain);
      gain.connect(this.output);
      osc.start();

      this.oscillators.push(osc);
      this.gains.push(gain);
    });
  }

  public setFrequency(freq: number, time: number) {
    this.oscillators.forEach((osc, index) => {
      osc.frequency.setTargetAtTime(freq * (index + 1), time, 0.05);
    });
  }

  public updateBrightness(brightness: number, time: number) {
    for (let i = 2; i < this.gains.length; i++) {
      const targetGain = this.HARMONIC_VOLUMES[i] * brightness;
      this.gains[i].gain.setTargetAtTime(targetGain, time, 0.1);
    }
  }
}

export class Envelope {
  constructor(
    private ctx: AudioContext,
    private targetParam: AudioParam,
  ) {}

  public triggerAttack() {
    const t = this.ctx.currentTime;
    this.targetParam.cancelScheduledValues(t);
    this.targetParam.setValueAtTime(0, t);
    this.targetParam.linearRampToValueAtTime(1, t + 0.03);
    this.targetParam.setTargetAtTime(1, t + 0.03, 0.12);
  }

  public triggerRelease() {
    const t = this.ctx.currentTime;
    this.targetParam.cancelScheduledValues(t);
    this.targetParam.setTargetAtTime(0, t, 0.18);
  }
}

export class Vibrato {
  private lfo: OscillatorNode;
  private gain: GainNode;

  constructor(
    private ctx: AudioContext,
    targetFreqParam: AudioParam,
    baseFreq: number,
  ) {
    this.lfo = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();

    this.lfo.frequency.value = 5.5;

    this.gain.gain.value = baseFreq * (8 / 1200);

    this.lfo.connect(this.gain);
    this.gain.connect(targetFreqParam);
    this.lfo.start();
  }

  public setIntensity(intensity: number, time: number) {
    const randomDrift = 5 + Math.random() * 2;
    this.lfo.frequency.setTargetAtTime(randomDrift, time, 0.2);
    this.gain.gain.setTargetAtTime(intensity, time, 0.1);
  }
}

export class BowNoise {
  public output: GainNode;
  private bufferSource!: AudioBufferSourceNode;
  private bandPass: BiquadFilterNode;
  private lowPass: BiquadFilterNode;

  constructor(private ctx: AudioContext) {
    this.output = this.ctx.createGain();
    this.output.gain.value = 0;

    this.bandPass = this.ctx.createBiquadFilter();
    this.bandPass.type = 'bandpass';
    this.bandPass.frequency.value = 3000;

    this.lowPass = this.ctx.createBiquadFilter();
    this.lowPass.type = 'lowpass';
    this.lowPass.frequency.value = 8000;

    this.initWhiteNoise();

    this.bufferSource.connect(this.bandPass);
    this.bandPass.connect(this.lowPass);
    this.lowPass.connect(this.output);
  }

  private initWhiteNoise() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.bufferSource = this.ctx.createBufferSource();
    this.bufferSource.buffer = buffer;
    this.bufferSource.loop = true;
    this.bufferSource.start();
  }

  public updateIntensity(velocity: number, pressure: number, time: number) {
    const finalVelocity = velocity < 0.01 ? 0 : velocity;
    const targetGain = Math.min(finalVelocity * 0.1 * pressure, 0.3);
    this.output.gain.setTargetAtTime(targetGain, time, 0.05);
  }
}

export class BodyResonator {
  public input: GainNode;
  public output: GainNode;

  constructor(private ctx: AudioContext) {
    this.input = this.ctx.createGain();
    this.output = this.ctx.createGain();

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 6000;

    const p1 = this.ctx.createBiquadFilter();
    p1.type = 'peaking';
    p1.frequency.value = 500;
    p1.gain.value = 5;

    const p2 = this.ctx.createBiquadFilter();
    p2.type = 'peaking';
    p2.frequency.value = 900;
    p2.gain.value = 3;

    const p3 = this.ctx.createBiquadFilter();
    p3.type = 'peaking';
    p3.frequency.value = 1800;
    p3.gain.value = 2;

    const hs = this.ctx.createBiquadFilter();
    hs.type = 'highshelf';
    hs.frequency.value = 4000;
    hs.gain.value = -2;

    this.input.connect(lp);
    lp.connect(p1);
    p1.connect(p2);
    p2.connect(p3);
    p3.connect(hs);
    hs.connect(this.output);
  }
}

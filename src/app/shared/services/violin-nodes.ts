export class Vibrato {
  private lfo: OscillatorNode;

  private targets: { gain: GainNode; harmonicNumber: number }[] = [];

  constructor(private ctx: AudioContext) {
    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.value = 5.5;
    this.lfo.start();
  }

  public addTarget(targetFreqParam: AudioParam, harmonicNumber: number) {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    this.lfo.connect(gain);
    gain.connect(targetFreqParam);
    this.targets.push({ gain, harmonicNumber });
  }

  public setIntensity(fundamentalHzDeviation: number, time: number) {
    const randomDrift = 5 + Math.random() * 2;
    this.lfo.frequency.setTargetAtTime(randomDrift, time, 0.2);
    this.targets.forEach(({ gain, harmonicNumber }) => {
      gain.gain.setTargetAtTime(fundamentalHzDeviation * harmonicNumber, time, 0.1);
    });
  }
}

export class HarmonicGenerator {
  public output: GainNode;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private vibrato: Vibrato;
  private readonly HARMONIC_VOLUMES = [1, 0.55, 0.35, 0.2, 0.12, 0.08];

  constructor(
    private ctx: AudioContext,
    private baseFreq: number,
  ) {
    this.output = this.ctx.createGain();
    this.output.gain.value = 1;
    this.vibrato = new Vibrato(ctx);
    this.initNodes();
  }

  private initNodes() {
    this.HARMONIC_VOLUMES.forEach((volume, index) => this.createHarmonic(index, volume));
  }

  private createHarmonic(index: number, volume: number) {
    const osc = this.createOscillator(index);
    const gain = this.createHarmonicGain(volume);
    osc.connect(gain);
    gain.connect(this.output);
    this.vibrato.addTarget(osc.frequency, index + 1);
    osc.start();
    this.oscillators.push(osc);
    this.gains.push(gain);
  }

  private createOscillator(index: number): OscillatorNode {
    const osc = this.ctx.createOscillator();
    osc.type = index === 0 ? 'sawtooth' : 'sine';
    osc.frequency.value = this.baseFreq * (index + 1);
    return osc;
  }

  private createHarmonicGain(volume: number): GainNode {
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    return gain;
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

  public applyVibrato(intensity: number, time: number) {
    this.vibrato.setIntensity(intensity, time);
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

export class BowNoise {
  public output: GainNode;
  private bufferSource: AudioBufferSourceNode;
  private bandPass: BiquadFilterNode;
  private lowPass: BiquadFilterNode;
  constructor(private ctx: AudioContext) {
    this.output = this.ctx.createGain();
    this.output.gain.value = 0;
    this.bandPass = this.createBandPass();
    this.lowPass = this.createLowPass();
    this.bufferSource = this.createNoiseSource();
    this.bufferSource.connect(this.bandPass);
    this.bandPass.connect(this.lowPass);
    this.lowPass.connect(this.output);
  }

  private createBandPass(): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    return filter;
  }

  private createLowPass(): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 8000;
    return filter;
  }

  private createNoiseBuffer(): AudioBuffer {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createNoiseSource(): AudioBufferSourceNode {
    const source = this.ctx.createBufferSource();
    source.buffer = this.createNoiseBuffer();
    source.loop = true;
    source.start();
    return source;
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
    const chain = this.createFilterChain();
    this.connectChain(chain);
  }
  private createFilterChain(): BiquadFilterNode[] {
    return [
      this.createLowpass(6000),
      this.createPeaking(500, 5),
      this.createPeaking(900, 3),
      this.createPeaking(1800, 2),
      this.createHighShelf(4000, -2),
    ];
  }

  private connectChain(chain: BiquadFilterNode[]) {
    this.input.connect(chain[0]);
    for (let i = 0; i < chain.length - 1; i++) {
      chain[i].connect(chain[i + 1]);
    }
    chain[chain.length - 1].connect(this.output);
  }

  private createLowpass(frequency: number): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    return filter;
  }

  private createPeaking(frequency: number, gain: number): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = frequency;
    filter.gain.value = gain;
    return filter;
  }

  private createHighShelf(frequency: number, gain: number): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highshelf';
    filter.frequency.value = frequency;
    filter.gain.value = gain;
    return filter;
  }
}

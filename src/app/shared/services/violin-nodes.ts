export class Vibrato {
  private static readonly BASE_LFO_RATE_HZ = 5.5;
  private static readonly RATE_JITTER_HZ = 0.4;
  private static readonly RATE_SMOOTHING = 1.5;
  private static readonly DEPTH_SMOOTHING = 0.12;
  private static readonly DRIFT_INTERVAL_MIN_SEC = 1.5;
  private static readonly DRIFT_INTERVAL_RANGE_SEC = 1;

  private lfo: OscillatorNode;
  private targets: { gain: GainNode; harmonicNumber: number }[] = [];
  private nextDriftAt = 0;

  constructor(private ctx: AudioContext) {
    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.value = Vibrato.BASE_LFO_RATE_HZ;
    this.lfo.start();
  }

  public addTarget(targetFreqParam: AudioParam, harmonicNumber: number) {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    this.lfo.connect(gain);
    gain.connect(targetFreqParam);
    this.targets.push({ gain, harmonicNumber });
  }

  public setIntensity(depthHzAtFundamental: number, time: number) {
    this.maybeDriftRate(time);
    this.targets.forEach(({ gain, harmonicNumber }) => {
      gain.gain.setTargetAtTime(depthHzAtFundamental * harmonicNumber, time, Vibrato.DEPTH_SMOOTHING);
    });
  }

  private maybeDriftRate(time: number) {
    if (time < this.nextDriftAt) return;
    const drift = Vibrato.BASE_LFO_RATE_HZ + (Math.random() * 2 - 1) * Vibrato.RATE_JITTER_HZ;
    this.lfo.frequency.setTargetAtTime(drift, time, Vibrato.RATE_SMOOTHING);
    this.nextDriftAt = time + Vibrato.DRIFT_INTERVAL_MIN_SEC + Math.random() * Vibrato.DRIFT_INTERVAL_RANGE_SEC;
  }
}

export class HarmonicGenerator {
  private static readonly BRIGHTNESS_START_INDEX = 2;
  private static readonly BRIGHTNESS_SMOOTHING = 0.1;
  private static readonly FREQUENCY_SMOOTHING = 0.05;
  private static readonly INHARMONICITY_CENTS_BASE = 0.9;
  private readonly HARMONIC_VOLUMES = [1, 0.55, 0.35, 0.2, 0.12, 0.08];

  public output: GainNode;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private vibrato: Vibrato;

  constructor(
    private ctx: AudioContext,
    private baseFreq: number,
  ) {
    this.output = this.ctx.createGain();
    this.output.gain.value = 1;
    this.vibrato = new Vibrato(ctx);
    this.initNodes();
  }

  public setFrequency(freq: number, time: number) {
    this.oscillators.forEach((osc, index) => {
      osc.frequency.setTargetAtTime(freq * (index + 1), time, HarmonicGenerator.FREQUENCY_SMOOTHING);
    });
  }

  public updateBrightness(brightness: number, time: number) {
    for (let i = HarmonicGenerator.BRIGHTNESS_START_INDEX; i < this.gains.length; i++) {
      const targetGain = this.HARMONIC_VOLUMES[i] * brightness;
      this.gains[i].gain.setTargetAtTime(targetGain, time, HarmonicGenerator.BRIGHTNESS_SMOOTHING);
    }
  }

  public applyVibrato(intensity: number, time: number) {
    this.vibrato.setIntensity(intensity, time);
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
    osc.type = 'sine';
    osc.frequency.value = this.baseFreq * (index + 1);
    osc.detune.value = this.computeInharmonicity(index);
    return osc;
  }

  private computeInharmonicity(index: number): number {
    if (index === 0) return 0;
    return (Math.random() * 2 - 1) * HarmonicGenerator.INHARMONICITY_CENTS_BASE * (index + 1);
  }

  private createHarmonicGain(volume: number): GainNode {
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    return gain;
  }
}

export class Envelope {
  private static readonly ATTACK_TIME_SEC = 0.045;
  private static readonly ATTACK_SMOOTHING = 0.12;
  private static readonly RELEASE_SMOOTHING = 0.18;
  private static readonly QUICK_RELEASE_SMOOTHING = 0.035;
  
  private static readonly PIZZ_ATTACK = 0.005;
  private static readonly PIZZ_DECAY = 2.0;

  constructor(
    private ctx: AudioContext,
    private targetParam: AudioParam,
  ) {}

  public triggerAttack() {
    const t = this.ctx.currentTime;
    this.targetParam.cancelScheduledValues(t);
    this.targetParam.setValueAtTime(0, t);
    this.targetParam.linearRampToValueAtTime(1, t + Envelope.ATTACK_TIME_SEC);
    this.targetParam.setTargetAtTime(1, t + Envelope.ATTACK_TIME_SEC, Envelope.ATTACK_SMOOTHING);
  }

  public triggerRelease(fast = false) {
    const t = this.ctx.currentTime;
    const timeConstant = fast ? Envelope.QUICK_RELEASE_SMOOTHING : Envelope.RELEASE_SMOOTHING;
    this.targetParam.cancelScheduledValues(t);
    this.targetParam.setTargetAtTime(0, t, timeConstant);
  }

  public triggerPizzicato() {
    const t = this.ctx.currentTime;
    this.targetParam.cancelScheduledValues(t);
    this.targetParam.setValueAtTime(0, t);
    this.targetParam.linearRampToValueAtTime(1, t + Envelope.PIZZ_ATTACK);
    this.targetParam.exponentialRampToValueAtTime(0.001, t + Envelope.PIZZ_DECAY);
    this.targetParam.setValueAtTime(0, t + Envelope.PIZZ_DECAY);
  }
}

export class BowNoise {
  private static readonly BANDPASS_FREQUENCY_HZ = 2600;
  private static readonly BANDPASS_Q = 0.5;
  private static readonly LOWPASS_FREQUENCY_HZ = 7000;
  private static readonly NOISE_BUFFER_DURATION_SEC = 2;
  private static readonly INTENSITY_SMOOTHING = 0.06;
  private static readonly MIN_VELOCITY_THRESHOLD = 0.01;
  private static readonly GAIN_SCALE = 0.08;
  private static readonly MAX_GAIN = 0.22;

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

  public updateIntensity(velocity: number, pressure: number, time: number) {
    const finalVelocity = velocity < BowNoise.MIN_VELOCITY_THRESHOLD ? 0 : velocity;
    const targetGain = Math.min(finalVelocity * BowNoise.GAIN_SCALE * pressure, BowNoise.MAX_GAIN);
    this.output.gain.setTargetAtTime(targetGain, time, BowNoise.INTENSITY_SMOOTHING);
  }

  private createBandPass(): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = BowNoise.BANDPASS_FREQUENCY_HZ;
    filter.Q.value = BowNoise.BANDPASS_Q;
    return filter;
  }

  private createLowPass(): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = BowNoise.LOWPASS_FREQUENCY_HZ;
    return filter;
  }

  private createNoiseBuffer(): AudioBuffer {
    const bufferSize = this.ctx.sampleRate * BowNoise.NOISE_BUFFER_DURATION_SEC;
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
}

interface FilterSpec {
  type: BiquadFilterType;
  frequency: number;
  gain?: number;
  q?: number;
}

export class BodyResonator {
  private static readonly FILTER_CHAIN: FilterSpec[] = [
    { type: 'lowpass', frequency: 6000 },
    { type: 'peaking', frequency: 500, gain: 5, q: 1.4 },
    { type: 'peaking', frequency: 900, gain: 3, q: 1.4 },
    { type: 'peaking', frequency: 1800, gain: 1.5, q: 1.2 },
    { type: 'highshelf', frequency: 4000, gain: -2 },
  ];

  public input: GainNode;
  public output: GainNode;

  constructor(private ctx: AudioContext) {
    this.input = this.ctx.createGain();
    this.output = this.ctx.createGain();
    this.connectChain(this.buildFilterChain());
  }

  private buildFilterChain(): BiquadFilterNode[] {
    return BodyResonator.FILTER_CHAIN.map((spec) => this.createFilter(spec));
  }

  private createFilter(spec: FilterSpec): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = spec.type;
    filter.frequency.value = spec.frequency;
    if (spec.gain !== undefined) filter.gain.value = spec.gain;
    if (spec.q !== undefined) filter.Q.value = spec.q;
    return filter;
  }

  private connectChain(chain: BiquadFilterNode[]) {
    this.input.connect(chain[0]);
    for (let i = 0; i < chain.length - 1; i++) {
      chain[i].connect(chain[i + 1]);
    }
    chain[chain.length - 1].connect(this.output);
  }
}

export class RoomReverb {
  public input: GainNode;
  public output: GainNode;
  
  private convolver: ConvolverNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  constructor(private ctx: AudioContext) {
    this.input = this.ctx.createGain();
    this.output = this.ctx.createGain();
    
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createSyntheticIR();

    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();

    this.dryGain.gain.value = 0.7; 
    this.wetGain.gain.value = 0.35;

    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.input.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.output);
  }

  private createSyntheticIR(): AudioBuffer {
    const duration = 1.8;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, sampleRate);

    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const noise = Math.random() * 2 - 1;
        const decay = Math.pow(1 - i / length, 3.5);
        data[i] = noise * decay;
      }
    }
    return buffer;
  }
}
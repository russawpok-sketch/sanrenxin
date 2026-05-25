import type { TransformEvent, TerrainType } from '@shared/types';

const VOLUME_STORAGE_KEY = 'livestock-sfx-volume';

interface ToneOptions {
  duration: number;
  frequency: number;
  frequencyEnd?: number;
  gain: number;
  type?: OscillatorType;
  when?: number;
}

interface NoiseOptions {
  duration: number;
  gain: number;
  highpass?: number;
  lowpass?: number;
  when?: number;
}

export class SfxManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private volume = 0.72;

  constructor() {
    this.volume = this.readStoredVolume();
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume * 0.25;
    }

    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, this.volume.toFixed(3));
    } catch {
      // Ignore persistence failures.
    }
  }

  async unlock(): Promise<void> {
    const audioContext = this.ensureContext();
    if (audioContext.state !== 'running') {
      await audioContext.resume();
    }
  }

  playUiTap(): void {
    this.withContext((audioContext) => {
      const start = audioContext.currentTime + 0.01;
      this.playTone(audioContext, { when: start, duration: 0.06, frequency: 760, frequencyEnd: 620, gain: 0.06, type: 'square' });
      this.playTone(audioContext, { when: start + 0.05, duration: 0.05, frequency: 980, frequencyEnd: 860, gain: 0.045, type: 'triangle' });
    });
  }

  playMic(enabled: boolean): void {
    this.withContext((audioContext) => {
      const start = audioContext.currentTime + 0.01;
      if (enabled) {
        this.playTone(audioContext, { when: start, duration: 0.08, frequency: 540, frequencyEnd: 720, gain: 0.08, type: 'sine' });
        this.playTone(audioContext, { when: start + 0.07, duration: 0.1, frequency: 760, frequencyEnd: 980, gain: 0.06, type: 'triangle' });
      } else {
        this.playTone(audioContext, { when: start, duration: 0.08, frequency: 840, frequencyEnd: 600, gain: 0.07, type: 'triangle' });
        this.playTone(audioContext, { when: start + 0.05, duration: 0.1, frequency: 520, frequencyEnd: 320, gain: 0.06, type: 'sine' });
      }
    });
  }

  playStartRun(): void {
    this.withContext((audioContext) => {
      const start = audioContext.currentTime + 0.02;
      this.playTone(audioContext, { when: start, duration: 0.09, frequency: 320, frequencyEnd: 380, gain: 0.08, type: 'triangle' });
      this.playTone(audioContext, { when: start + 0.08, duration: 0.09, frequency: 420, frequencyEnd: 520, gain: 0.07, type: 'triangle' });
      this.playTone(audioContext, { when: start + 0.16, duration: 0.12, frequency: 560, frequencyEnd: 720, gain: 0.08, type: 'square' });
    });
  }

  playTransform(event: TransformEvent): void {
    this.withContext((audioContext) => {
      const start = audioContext.currentTime + 0.01;
      switch (event.animal) {
        case 'rooster':
          this.playTone(audioContext, { when: start, duration: 0.1, frequency: 820, frequencyEnd: 1280, gain: 0.08, type: 'square' });
          this.playTone(audioContext, { when: start + 0.08, duration: 0.12, frequency: 980, frequencyEnd: 1560, gain: 0.07, type: 'triangle' });
          this.playNoise(audioContext, { when: start + 0.03, duration: 0.08, gain: 0.016, highpass: 1500 });
          break;
        case 'monkey':
          this.playTone(audioContext, { when: start, duration: 0.06, frequency: 520, frequencyEnd: 660, gain: 0.07, type: 'square' });
          this.playTone(audioContext, { when: start + 0.06, duration: 0.06, frequency: 610, frequencyEnd: 540, gain: 0.06, type: 'square' });
          this.playTone(audioContext, { when: start + 0.12, duration: 0.07, frequency: 720, frequencyEnd: 580, gain: 0.05, type: 'triangle' });
          break;
        case 'dog':
          this.playTone(audioContext, { when: start, duration: 0.09, frequency: 220, frequencyEnd: 140, gain: 0.11, type: 'sawtooth' });
          this.playNoise(audioContext, { when: start + 0.01, duration: 0.09, gain: 0.04, highpass: 420, lowpass: 1800 });
          break;
        case 'duck':
          this.playTone(audioContext, { when: start, duration: 0.08, frequency: 420, frequencyEnd: 300, gain: 0.085, type: 'square' });
          this.playTone(audioContext, { when: start + 0.09, duration: 0.09, frequency: 360, frequencyEnd: 260, gain: 0.072, type: 'square' });
          break;
      }

      if (event.source === 'microphone') {
        this.playTone(audioContext, { when: start + 0.16, duration: 0.08, frequency: 1120, frequencyEnd: 1360, gain: 0.03, type: 'sine' });
      }
    });
  }

  playTerrainSuccess(terrain: TerrainType): void {
    this.withContext((audioContext) => {
      const start = audioContext.currentTime + 0.01;
      switch (terrain) {
        case 'wall':
          this.playTone(audioContext, { when: start, duration: 0.14, frequency: 190, frequencyEnd: 110, gain: 0.11, type: 'sawtooth' });
          this.playNoise(audioContext, { when: start, duration: 0.13, gain: 0.045, highpass: 280, lowpass: 1400 });
          break;
        case 'tree':
          this.playTone(audioContext, { when: start, duration: 0.08, frequency: 300, frequencyEnd: 420, gain: 0.07, type: 'triangle' });
          this.playTone(audioContext, { when: start + 0.07, duration: 0.08, frequency: 410, frequencyEnd: 540, gain: 0.065, type: 'triangle' });
          this.playTone(audioContext, { when: start + 0.14, duration: 0.1, frequency: 520, frequencyEnd: 720, gain: 0.05, type: 'sine' });
          break;
        case 'pit':
          this.playTone(audioContext, { when: start, duration: 0.1, frequency: 340, frequencyEnd: 620, gain: 0.07, type: 'triangle' });
          this.playTone(audioContext, { when: start + 0.09, duration: 0.12, frequency: 620, frequencyEnd: 440, gain: 0.06, type: 'sine' });
          break;
        case 'water':
          this.playTone(audioContext, { when: start, duration: 0.1, frequency: 440, frequencyEnd: 360, gain: 0.05, type: 'sine' });
          this.playTone(audioContext, { when: start + 0.06, duration: 0.12, frequency: 520, frequencyEnd: 420, gain: 0.045, type: 'sine' });
          this.playNoise(audioContext, { when: start, duration: 0.16, gain: 0.02, highpass: 700, lowpass: 2600 });
          break;
      }
    });
  }

  playCrash(terrain: TerrainType): void {
    this.withContext((audioContext) => {
      const start = audioContext.currentTime + 0.01;
      this.playTone(audioContext, { when: start, duration: 0.14, frequency: 220, frequencyEnd: 120, gain: 0.12, type: 'sawtooth' });
      this.playTone(audioContext, { when: start + 0.07, duration: 0.22, frequency: 180, frequencyEnd: 70, gain: 0.08, type: 'square' });
      this.playNoise(audioContext, {
        when: start,
        duration: terrain === 'water' ? 0.2 : 0.14,
        gain: terrain === 'water' ? 0.03 : 0.045,
        highpass: 200,
        lowpass: terrain === 'water' ? 2200 : 1000,
      });
    });
  }

  private withContext(callback: (audioContext: AudioContext) => void): void {
    try {
      const audioContext = this.ensureContext();
      if (audioContext.state !== 'running') {
        void audioContext.resume();
      }
      callback(audioContext);
    } catch {
      // Ignore audio failures so gameplay never breaks.
    }
  }

  private ensureContext(): AudioContext {
    if (this.audioContext && this.masterGain) {
      return this.audioContext;
    }

    const audioContext = new AudioContext();
    const masterGain = audioContext.createGain();
    masterGain.gain.value = this.volume * 0.25;
    masterGain.connect(audioContext.destination);

    this.audioContext = audioContext;
    this.masterGain = masterGain;
    return audioContext;
  }

  private readStoredVolume(): number {
    try {
      const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
      const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
      if (Number.isFinite(parsed)) {
        return Math.min(1, Math.max(0, parsed));
      }
    } catch {
      // Ignore storage failures and keep default.
    }

    return 0.72;
  }

  private playTone(audioContext: AudioContext, options: ToneOptions): void {
    if (!this.masterGain) {
      return;
    }

    const start = options.when ?? audioContext.currentTime;
    const end = start + options.duration;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = options.type ?? 'square';
    oscillator.frequency.setValueAtTime(options.frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, options.frequencyEnd ?? options.frequency), end);

    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.gain), start + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }

  private playNoise(audioContext: AudioContext, options: NoiseOptions): void {
    if (!this.masterGain) {
      return;
    }

    const start = options.when ?? audioContext.currentTime;
    const end = start + options.duration;
    const source = audioContext.createBufferSource();
    source.buffer = this.getNoiseBuffer(audioContext);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(Math.max(0.0001, options.gain), start);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

    let output: AudioNode = source;

    if (options.highpass) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = options.highpass;
      output.connect(filter);
      output = filter;
    }

    if (options.lowpass) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = options.lowpass;
      output.connect(filter);
      output = filter;
    }

    output.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start(start);
    source.stop(end + 0.01);
  }

  private getNoiseBuffer(audioContext: AudioContext): AudioBuffer {
    if (this.noiseBuffer) {
      return this.noiseBuffer;
    }

    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.5, audioContext.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }
}

import { ANIMAL_HINTS, ANIMAL_LABELS, VOICE_COMMANDS, type AnimalType } from '@shared/types';

type TransformHandler = (animal: AnimalType, confidence: number) => void;
type StatusHandler = (message: string) => void;
type RecognitionMode = 'keyword' | 'acoustic';

interface PhraseState {
  startedAt: number;
  lastLoudAt: number;
  peakCount: number;
  totalCentroid: number;
  samples: number;
  maxRms: number;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string;
  message?: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

const keywordSummary = Object.values(VOICE_COMMANDS)
  .map((command) => command.primary)
  .join(' / ');

export class MicTransformRecognizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private speechRecognition: BrowserSpeechRecognition | null = null;
  private timeDomain = new Uint8Array(2048);
  private frequency = new Uint8Array(1024);
  private loopId: number | null = null;
  private phrase: PhraseState | null = null;
  private loudLastTick = false;
  private transformHandler: TransformHandler | null = null;
  private statusHandler: StatusHandler | null = null;
  private mode: RecognitionMode | null = null;
  private keepSpeechAlive = false;
  private lastKeywordAnimal: AnimalType | null = null;
  private lastKeywordAt = 0;

  isRunning(): boolean {
    return this.mode !== null;
  }

  async start(onTransform: TransformHandler, onStatus: StatusHandler): Promise<void> {
    if (this.isRunning()) {
      return;
    }

    this.transformHandler = onTransform;
    this.statusHandler = onStatus;

    const SpeechRecognitionCtor = this.getSpeechRecognitionConstructor();
    if (SpeechRecognitionCtor) {
      try {
        this.startKeywordRecognition(SpeechRecognitionCtor);
        return;
      } catch {
        this.keepSpeechAlive = false;
        this.stopKeywordRecognition();
        this.mode = null;
        this.statusHandler?.('固定词识别没拉起来，回退到声线识别。');
      }
    }

    await this.startAcousticRecognition();
  }

  stop(): void {
    this.keepSpeechAlive = false;
    this.stopKeywordRecognition();
    this.stopAcousticRecognition();
    this.mode = null;
  }

  private getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
    const browserWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
  }

  private startKeywordRecognition(SpeechRecognitionCtor: SpeechRecognitionConstructor): void {
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;

    this.speechRecognition = recognition;
    this.mode = 'keyword';
    this.keepSpeechAlive = true;
    this.lastKeywordAnimal = null;
    this.lastKeywordAt = 0;

    recognition.onstart = () => {
      this.statusHandler?.(`麦克风已开启，说固定词：${keywordSummary}。`);
    };

    recognition.onresult = (event) => {
      this.handleKeywordResults(event);
    };

    recognition.onerror = (event) => {
      const error = event.error ?? 'unknown';

      if (error === 'not-allowed' || error === 'service-not-allowed') {
        this.statusHandler?.('麦克风权限没打开，先允许浏览器访问后再试。');
        this.stop();
        return;
      }

      if (error === 'network' || error === 'language-not-supported') {
        this.statusHandler?.('固定词识别不可用，回退到声线识别。');
        this.keepSpeechAlive = false;
        this.stopKeywordRecognition();
        void this.startAcousticRecognition().catch(() => {
          this.statusHandler?.('声线识别也没启动起来，请再点一次麦克风。');
          this.mode = null;
        });
        return;
      }

      if (error !== 'aborted' && error !== 'no-speech') {
        this.statusHandler?.('固定词没听清，继续监听中。');
      }
    };

    recognition.onend = () => {
      if (!this.keepSpeechAlive || this.speechRecognition !== recognition) {
        return;
      }

      try {
        recognition.start();
      } catch {
        this.statusHandler?.('固定词识别中断，回退到声线识别。');
        this.keepSpeechAlive = false;
        this.stopKeywordRecognition();
        void this.startAcousticRecognition();
      }
    };

    recognition.start();
  }

  private stopKeywordRecognition(): void {
    const recognition = this.speechRecognition;
    this.speechRecognition = null;
    if (!recognition) {
      return;
    }

    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;

    try {
      recognition.stop();
    } catch {
      // Ignore stop failures from browser speech engines.
    }
  }

  private handleKeywordResults(event: SpeechRecognitionEventLike): void {
    for (let resultIndex = event.resultIndex; resultIndex < event.results.length; resultIndex += 1) {
      const result = event.results[resultIndex];
      const transcript = this.normalizeTranscript(
        Array.from({ length: result.length }, (_, index) => result[index]?.transcript ?? '').join(''),
      );

      const match = this.matchKeywordTranscript(transcript);
      if (!match) {
        continue;
      }

      const now = Date.now();
      if (this.lastKeywordAnimal === match.animal && now - this.lastKeywordAt < 900) {
        continue;
      }

      this.lastKeywordAnimal = match.animal;
      this.lastKeywordAt = now;
      this.transformHandler?.(match.animal, match.confidence);
      this.statusHandler?.(`听到“${match.phrase}”，切到${ANIMAL_LABELS[match.animal]}。`);
      return;
    }
  }

  private matchKeywordTranscript(transcript: string): { animal: AnimalType; phrase: string; confidence: number } | null {
    if (!transcript) {
      return null;
    }

    for (const animal of Object.keys(VOICE_COMMANDS) as AnimalType[]) {
      const aliases = [...VOICE_COMMANDS[animal].aliases].sort((left, right) => right.length - left.length);
      for (const alias of aliases) {
        const normalizedAlias = this.normalizeTranscript(alias);
        if (transcript.includes(normalizedAlias)) {
          return {
            animal,
            phrase: VOICE_COMMANDS[animal].primary,
            confidence: normalizedAlias === this.normalizeTranscript(VOICE_COMMANDS[animal].primary) ? 0.96 : 0.88,
          };
        }
      }
    }

    return null;
  }

  private normalizeTranscript(transcript: string): string {
    return transcript.toLowerCase().replace(/[\s,.!?;:'"`~\-_/\\|()[\]{}，。！？；：、]/g, '');
  }

  private async startAcousticRecognition(): Promise<void> {
    if (this.audioContext) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.18;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    this.stream = stream;
    this.audioContext = audioContext;
    this.analyser = analyser;
    this.source = source;
    this.mode = 'acoustic';

    this.statusHandler?.(`固定词不可用，改用声线识别：${Object.values(ANIMAL_HINTS).join(' / ')}。`);
    this.loop();
  }

  private stopAcousticRecognition(): void {
    if (this.loopId !== null) {
      window.clearTimeout(this.loopId);
      this.loopId = null;
    }

    this.source?.disconnect();
    this.source = null;
    this.analyser = null;
    this.phrase = null;
    this.loudLastTick = false;

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;

    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }

  private loop(): void {
    const analyser = this.analyser;
    if (!analyser || !this.audioContext) {
      return;
    }

    analyser.getByteTimeDomainData(this.timeDomain);
    analyser.getByteFrequencyData(this.frequency);

    const now = performance.now();
    const rms = this.computeRms(this.timeDomain);
    const centroid = this.computeCentroid(this.frequency, this.audioContext.sampleRate, analyser.fftSize);
    const loud = rms > 0.075;

    if (loud) {
      if (!this.phrase) {
        this.phrase = {
          startedAt: now,
          lastLoudAt: now,
          peakCount: 0,
          totalCentroid: 0,
          samples: 0,
          maxRms: 0,
        };
      }

      if (!this.loudLastTick || rms > 0.14) {
        this.phrase.peakCount += 1;
      }

      this.phrase.lastLoudAt = now;
      this.phrase.samples += 1;
      this.phrase.totalCentroid += centroid;
      this.phrase.maxRms = Math.max(this.phrase.maxRms, rms);
    } else if (this.phrase && now - this.phrase.lastLoudAt > 170) {
      this.finalizePhrase(this.phrase);
      this.phrase = null;
    }

    this.loudLastTick = loud;
    this.loopId = window.setTimeout(() => this.loop(), 90);
  }

  private finalizePhrase(phrase: PhraseState): void {
    const duration = phrase.lastLoudAt - phrase.startedAt;
    if (duration < 120 || phrase.samples < 2) {
      this.statusHandler?.('声音太短，没抓住；也可以直接说固定词。');
      return;
    }

    const averageCentroid = phrase.totalCentroid / phrase.samples;
    const { animal, confidence } = this.classify(duration, phrase.peakCount, averageCentroid, phrase.maxRms);

    this.transformHandler?.(animal, confidence);
    this.statusHandler?.(`先按声线识别到 ${ANIMAL_LABELS[animal]}；更稳的是直接说 ${VOICE_COMMANDS[animal].primary}。`);
  }

  private classify(
    duration: number,
    peakCount: number,
    centroid: number,
    maxRms: number,
  ): { animal: AnimalType; confidence: number } {
    if (duration > 760) {
      return { animal: 'duck', confidence: Math.min(0.94, 0.65 + duration / 2200) };
    }

    if (peakCount >= 4 || centroid > 1750) {
      return { animal: 'rooster', confidence: Math.min(0.91, 0.58 + peakCount * 0.08) };
    }

    if (duration < 330 && peakCount <= 2 && maxRms > 0.1) {
      return { animal: 'dog', confidence: Math.min(0.9, 0.62 + maxRms * 1.8) };
    }

    return { animal: 'monkey', confidence: Math.min(0.88, 0.58 + peakCount * 0.05) };
  }

  private computeRms(buffer: Uint8Array): number {
    let sum = 0;
    for (const sample of buffer) {
      const normalized = (sample - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / buffer.length);
  }

  private computeCentroid(buffer: Uint8Array, sampleRate: number, fftSize: number): number {
    let weighted = 0;
    let total = 0;
    for (let index = 0; index < buffer.length; index += 1) {
      const magnitude = buffer[index] / 255;
      const frequency = (index * sampleRate) / fftSize;
      weighted += frequency * magnitude;
      total += magnitude;
    }
    return total === 0 ? 0 : weighted / total;
  }
}

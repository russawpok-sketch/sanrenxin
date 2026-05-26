import { ANIMAL_LABELS, type AnimalType } from '@shared/types';

type TransformHandler = (animal: AnimalType, confidence: number) => void;
type StatusHandler = (message: string) => void;

interface FunASRResponse {
  text: string;
  duration?: number;
  language?: string;
}

/**
 * FunASR 语音识别器
 * 使用 FunASR 服务器进行高精度语音识别
 */
export class FunASRRecognizer {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private transformHandler: TransformHandler | null = null;
  private statusHandler: StatusHandler | null = null;
  private recordingTimeout: number | null = null;
  private lastRecognitionTime = 0;
  private readonly FUNASR_API_URL = 'http://localhost:10096/v1/audio/transcriptions';
  private readonly MIN_RECOGNITION_INTERVAL = 800; // 最小识别间隔（毫秒）

  // 动物关键词映射
  private readonly ANIMAL_KEYWORDS: Record<AnimalType, string[]> = {
    rooster: ['鸡', '公鸡'],
    monkey: ['猴', '猴子'],
    dog: ['狗', '狗狗'],
    duck: ['鸭', '鸭子'],
  };

  isRunning(): boolean {
    return this.isRecording;
  }

  async start(onTransform: TransformHandler, onStatus: StatusHandler): Promise<void> {
    if (this.isRecording) {
      return;
    }

    this.transformHandler = onTransform;
    this.statusHandler = onStatus;

    try {
      // 检查 FunASR 服务器是否可用
      await this.checkFunASRServer();

      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // FunASR 推荐采样率
        },
      });

      // 创建 MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        void this.processRecording();
      };

      this.isRecording = true;
      this.startRecordingCycle();
      this.statusHandler?.('🎤 FunASR 识别已启动 · 说「公鸡/猴子/狗/鸭子」');
    } catch (error) {
      const message = error instanceof Error ? error.message : '启动失败';
      this.statusHandler?.(message);
      throw error;
    }
  }

  stop(): void {
    this.isRecording = false;

    if (this.recordingTimeout !== null) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.mediaRecorder = null;
    this.audioChunks = [];

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  private async checkFunASRServer(): Promise<void> {
    try {
      const response = await fetch('http://localhost:10096/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        throw new Error('FunASR 服务器未响应');
      }
    } catch (error) {
      throw new Error(
        'FunASR 服务器未启动\n' +
        '请运行: scripts/start-funasr.bat\n' +
        '或使用键盘控制: 1/2/3/4'
      );
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  private startRecordingCycle(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }

    // 清空之前的音频数据
    this.audioChunks = [];

    // 开始录制（1.5秒）
    this.mediaRecorder.start();

    // 1.5秒后停止录制并识别
    this.recordingTimeout = window.setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
    }, 1500);
  }

  private async processRecording(): Promise<void> {
    if (this.audioChunks.length === 0) {
      this.startRecordingCycle();
      return;
    }

    // 检查识别间隔
    const now = Date.now();
    if (now - this.lastRecognitionTime < this.MIN_RECOGNITION_INTERVAL) {
      this.audioChunks = [];
      this.startRecordingCycle();
      return;
    }

    try {
      // 创建音频 Blob
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];

      // 发送到 FunASR 服务器
      const result = await this.recognizeAudio(audioBlob);

      if (result) {
        this.lastRecognitionTime = now;
        const match = this.matchAnimalKeyword(result.text);

        if (match) {
          this.transformHandler?.(match.animal, match.confidence);
          this.statusHandler?.(
            `识别: "${result.text}" → ${ANIMAL_LABELS[match.animal]} (${Math.round(match.confidence * 100)}%)`
          );
        } else {
          this.statusHandler?.(`识别: "${result.text}" (未匹配动物)`);
        }
      }
    } catch (error) {
      console.error('[FunASR] 识别失败:', error);
      this.statusHandler?.('识别失败，继续监听...');
    }

    // 继续下一轮录制
    if (this.isRecording) {
      this.startRecordingCycle();
    }
  }

  private async recognizeAudio(audioBlob: Blob): Promise<FunASRResponse | null> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'sensevoice');
    formData.append('response_format', 'json');

    try {
      const response = await fetch(this.FUNASR_API_URL, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as FunASRResponse;
      return data;
    } catch (error) {
      console.error('[FunASR] API 调用失败:', error);
      return null;
    }
  }

  private matchAnimalKeyword(text: string): { animal: AnimalType; confidence: number } | null {
    if (!text) {
      return null;
    }

    const normalized = text.toLowerCase().replace(/[\s,.!?;:'"`~\-_/\\|()[\]{}，。！？；：、]/g, '');

    // 遍历所有动物关键词
    for (const [animal, keywords] of Object.entries(this.ANIMAL_KEYWORDS) as [AnimalType, string[]][]) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword.toLowerCase())) {
          // 根据关键词长度和匹配度计算置信度
          const confidence = keyword.length >= 2 ? 0.92 : 0.85;
          return { animal, confidence };
        }
      }
    }

    return null;
  }
}

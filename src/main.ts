import { emitTransform } from '@shared/events';
import { ANIMAL_HINTS, ANIMAL_LABELS, VOICE_COMMANDS, type AnimalType } from '@shared/types';
import { MicTransformRecognizer } from './audio/MicTransformRecognizer';
import { FunASRRecognizer } from './audio/FunASRRecognizer';
import { SfxManager } from './audio/SfxManager';
import { GameEngine } from './game/GameEngine';
import { GameUI } from './game/GameUI';
import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root not found.');
}

const ui = new GameUI(app);
const sfx = new SfxManager();
const engine = new GameEngine(ui.canvas, ui, sfx);
const micRecognizer = new MicTransformRecognizer();
const funasrRecognizer = new FunASRRecognizer(); // FunASR 识别器
const voiceCommandSummary = Object.values(VOICE_COMMANDS)
  .map((command) => command.primary)
  .join(' / ');

const roastTemplates: Record<AnimalType, string[]> = {
  rooster: ['这声公鸡够嚣张，墙看了都想躲。', '像闹钟成精，公鸡形态到位。'],
  monkey: ['猴味上来了，树枝已经开始发抖。', '这一嗓子像在山顶抢香蕉。'],
  dog: ['这声汪汪很有冲劲，坑都得让路。', '狗塑成功，跳过去别回头。'],
  duck: ['鸭味纯正，水面已经替你开道。', '这一声嘎嘎，泳道自动解锁。'],
};

const hotkeys: Record<string, AnimalType> = {
  '1': 'rooster',
  '2': 'monkey',
  '3': 'dog',
  '4': 'duck',
};

function randomRoast(animal: AnimalType): string {
  const pool = roastTemplates[animal];
  return pool[Math.floor(Math.random() * pool.length)] ?? `${ANIMAL_LABELS[animal]}已就位。`;
}

function triggerTransform(animal: AnimalType, source: 'keyboard' | 'touch' | 'microphone'): void {
  emitTransform({
    animal,
    confidence: source === 'microphone' ? 0.78 : 0.98,
    roastText: randomRoast(animal),
    timestamp: Date.now(),
    source,
  });
}

function handleKeydown(event: KeyboardEvent): void {
  void sfx.unlock();

  const animal = hotkeys[event.key];
  if (!animal) {
    if (event.key.toLowerCase() === 'r') {
      engine.startNewRun();
    }
    return;
  }

  triggerTransform(animal, 'keyboard');
  ui.setStatus(`键盘变身: ${ANIMAL_LABELS[animal]} (${ANIMAL_HINTS[animal]})`);
}

async function toggleMic(): Promise<void> {
  // 优先尝试 FunASR
  if (funasrRecognizer.isRunning()) {
    funasrRecognizer.stop();
    sfx.playMic(false);
    ui.setMicEnabled(false);
    ui.setStatus(`麦克风已关闭，继续用 1/2/3/4、下方按钮，或重新开麦。`);
    return;
  }

  if (micRecognizer.isRunning()) {
    micRecognizer.stop();
    sfx.playMic(false);
    ui.setMicEnabled(false);
    ui.setStatus(`麦克风已关闭，继续用 1/2/3/4、下方按钮，或重新开麦。`);
    return;
  }

  try {
    void sfx.unlock();
    ui.setStatus('正在启动 FunASR 识别...');
    
    // 先尝试 FunASR
    try {
      await funasrRecognizer.start(
        (animal, confidence) => {
          triggerTransform(animal, 'microphone');
          ui.setStatus(`FunASR: ${ANIMAL_LABELS[animal]} (${Math.round(confidence * 100)}%)`);
        },
        (message) => {
          ui.setStatus(message);
        },
      );
      sfx.playMic(true);
      ui.setMicEnabled(true);
      return;
    } catch (funasrError) {
      // FunASR 失败，回退到浏览器识别
      console.warn('[FunASR] 启动失败，回退到浏览器识别:', funasrError);
      ui.setStatus('FunASR 不可用，使用浏览器识别...');
      
      await micRecognizer.start(
        (animal, confidence) => {
          triggerTransform(animal, 'microphone');
          ui.setStatus(`麦克风识别: ${ANIMAL_LABELS[animal]} (${Math.round(confidence * 100)}%)`);
        },
        (message) => {
          ui.setStatus(message);
        },
      );
      sfx.playMic(true);
      ui.setMicEnabled(true);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '麦克风启动失败。';
    ui.setStatus(message);
    ui.setMicEnabled(false);
  }
}

window.addEventListener('keydown', handleKeydown);
ui.onAnimalSelect((animal) => {
  void sfx.unlock();
  sfx.playUiTap();
  triggerTransform(animal, 'touch');
  ui.setStatus(`按钮变身: ${ANIMAL_LABELS[animal]} (${ANIMAL_HINTS[animal]})`);
});
ui.setVolume(sfx.getVolume());
ui.onVolumeChange((volume, commit) => {
  sfx.setVolume(volume);
  if (commit) {
    void sfx.unlock();
    sfx.playUiTap();
  }
});
ui.onStart(() => {
  void sfx.unlock();
  sfx.playUiTap();
  engine.startNewRun();
});
ui.onEnableMic(() => {
  sfx.playUiTap();
  void toggleMic();
});

ui.setStatus(`按 1/2/3/4 变身，或开启麦克风直接说 ${voiceCommandSummary}。`);
engine.startIdle();

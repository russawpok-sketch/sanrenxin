import {
  ANIMAL_HINTS,
  ANIMAL_LABELS,
  ANIMAL_SKILLS,
  VOICE_COMMANDS,
  type AnimalType,
  type TerrainType,
  TERRAIN_HINTS,
} from '@shared/types';
import type { PlayerForm } from './Player';

export class GameUI {
  readonly canvas: HTMLCanvasElement;
  private readonly animalLabel: HTMLElement;
  private readonly skillLabel: HTMLElement;
  private readonly scoreLabel: HTMLElement;
  private readonly hintLabel: HTMLElement;
  private readonly roastLabel: HTMLElement;
  private readonly statusLabel: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly overlayTitle: HTMLElement;
  private readonly overlayBody: HTMLElement;
  private readonly overlayButton: HTMLButtonElement;
  private readonly micButton: HTMLButtonElement;
  private readonly volumeSlider: HTMLInputElement;
  private readonly volumeValue: HTMLElement;
  private readonly animalButtons: Map<AnimalType, HTMLButtonElement>;
  private startHandler: (() => void) | null = null;
  private micHandler: (() => void) | null = null;
  private volumeHandler: ((volume: number, commit: boolean) => void) | null = null;

  constructor(root: HTMLElement) {
    const commandSummary = Object.values(VOICE_COMMANDS)
      .map((command) => command.primary)
      .join(' / ');

    root.innerHTML = `
      <main class="game-app">
        <section class="game-stage">
          <header class="hud-row">
            <div class="hud-chip">
              <span class="hud-title">当前形态</span>
              <strong id="animal-label">未变身</strong>
              <small id="skill-label">先喊一嗓子再开跑</small>
            </div>
            <div class="hud-chip hud-score">
              <span class="hud-title">里程</span>
              <strong id="score-label">0 m</strong>
            </div>
          </header>
          <canvas id="game-canvas" width="960" height="540" aria-label="牲畜体验器画布"></canvas>
          <div class="volume-panel">
            <span class="hud-title">音量</span>
            <div class="volume-row">
              <input type="range" id="volume-slider" class="volume-slider" min="0" max="100" step="1" value="72" aria-label="音量控制">
              <strong id="volume-value">72%</strong>
            </div>
          </div>
          <div class="hint-banner" id="hint-label">前方等待指令</div>
          <div class="overlay visible" id="overlay">
            <div class="overlay-copy">
              <p class="eyebrow">Web Demo</p>
              <h1 id="overlay-title">牲畜体验器</h1>
              <p id="overlay-body">按 1/2/3/4 或点下方按钮变身；开麦后也可以直接说 ${commandSummary}。</p>
              <div class="overlay-actions">
                <button type="button" id="start-button" class="primary-button">开始游戏</button>
                <button type="button" id="mic-button" class="secondary-button">开启麦克风</button>
              </div>
            </div>
          </div>
        </section>
        <footer class="control-strip">
          <div class="animal-grid">
            <button type="button" class="animal-button" data-animal="rooster">
              <span class="hotkey">1</span>
              <strong>${ANIMAL_LABELS.rooster}</strong>
              <small>${ANIMAL_HINTS.rooster}</small>
            </button>
            <button type="button" class="animal-button" data-animal="monkey">
              <span class="hotkey">2</span>
              <strong>${ANIMAL_LABELS.monkey}</strong>
              <small>${ANIMAL_HINTS.monkey}</small>
            </button>
            <button type="button" class="animal-button" data-animal="dog">
              <span class="hotkey">3</span>
              <strong>${ANIMAL_LABELS.dog}</strong>
              <small>${ANIMAL_HINTS.dog}</small>
            </button>
            <button type="button" class="animal-button" data-animal="duck">
              <span class="hotkey">4</span>
              <strong>${ANIMAL_LABELS.duck}</strong>
              <small>${ANIMAL_HINTS.duck}</small>
            </button>
          </div>
          <div class="status-strip">
            <div class="status-block">
              <span class="hud-title">识别状态</span>
              <strong id="status-label">键盘与按钮已就绪</strong>
            </div>
            <div class="status-block">
              <span class="hud-title">吐槽播报</span>
              <strong id="roast-label">等你先变个身。</strong>
            </div>
          </div>
        </footer>
      </main>
    `;

    this.canvas = root.querySelector<HTMLCanvasElement>('#game-canvas')!;
    this.animalLabel = root.querySelector<HTMLElement>('#animal-label')!;
    this.skillLabel = root.querySelector<HTMLElement>('#skill-label')!;
    this.scoreLabel = root.querySelector<HTMLElement>('#score-label')!;
    this.hintLabel = root.querySelector<HTMLElement>('#hint-label')!;
    this.roastLabel = root.querySelector<HTMLElement>('#roast-label')!;
    this.statusLabel = root.querySelector<HTMLElement>('#status-label')!;
    this.overlay = root.querySelector<HTMLElement>('#overlay')!;
    this.overlayTitle = root.querySelector<HTMLElement>('#overlay-title')!;
    this.overlayBody = root.querySelector<HTMLElement>('#overlay-body')!;
    this.overlayButton = root.querySelector<HTMLButtonElement>('#start-button')!;
    this.micButton = root.querySelector<HTMLButtonElement>('#mic-button')!;
    this.volumeSlider = root.querySelector<HTMLInputElement>('#volume-slider')!;
    this.volumeValue = root.querySelector<HTMLElement>('#volume-value')!;
    this.animalButtons = new Map(
      Array.from(root.querySelectorAll<HTMLButtonElement>('.animal-button')).map((button) => [
        button.dataset.animal as AnimalType,
        button,
      ]),
    );

    this.overlayButton.addEventListener('click', () => {
      this.startHandler?.();
    });

    this.micButton.addEventListener('click', () => {
      this.micHandler?.();
    });

    this.volumeSlider.addEventListener('input', () => {
      const volume = Number(this.volumeSlider.value) / 100;
      this.volumeValue.textContent = `${this.volumeSlider.value}%`;
      this.volumeHandler?.(volume, false);
    });

    this.volumeSlider.addEventListener('change', () => {
      const volume = Number(this.volumeSlider.value) / 100;
      this.volumeValue.textContent = `${this.volumeSlider.value}%`;
      this.volumeHandler?.(volume, true);
    });
  }

  onStart(handler: () => void): void {
    this.startHandler = handler;
  }

  onEnableMic(handler: () => void): void {
    this.micHandler = handler;
  }

  onVolumeChange(handler: (volume: number, commit: boolean) => void): void {
    this.volumeHandler = handler;
  }

  onAnimalSelect(handler: (animal: AnimalType) => void): void {
    for (const [animal, button] of this.animalButtons) {
      button.addEventListener('click', () => handler(animal));
    }
  }

  setCurrentAnimal(form: PlayerForm): void {
    if (form === 'runner') {
      this.animalLabel.textContent = '未变身';
      this.skillLabel.textContent = '快选一个动物形态';
    } else {
      this.animalLabel.textContent = ANIMAL_LABELS[form];
      this.skillLabel.textContent = `${ANIMAL_SKILLS[form]} · ${ANIMAL_HINTS[form]} · ${VOICE_COMMANDS[form].primary}`;
    }

    for (const [animal, button] of this.animalButtons) {
      button.classList.toggle('active', animal === form);
    }
  }

  setScore(score: number): void {
    this.scoreLabel.textContent = `${Math.floor(score)} m`;
  }

  setHint(terrain: TerrainType | null): void {
    this.hintLabel.textContent = terrain ? TERRAIN_HINTS[terrain] : '前方等待指令';
  }

  setStatus(message: string): void {
    this.statusLabel.textContent = message;
  }

  setRoast(message: string): void {
    this.roastLabel.textContent = message;
  }

  showOverlay(title: string, body: string, actionLabel: string): void {
    this.overlayTitle.textContent = title;
    this.overlayBody.textContent = body;
    this.overlayButton.textContent = actionLabel;
    this.overlay.classList.add('visible');
  }

  hideOverlay(): void {
    this.overlay.classList.remove('visible');
  }

  setMicEnabled(enabled: boolean): void {
    this.micButton.textContent = enabled ? '关闭麦克风' : '开启麦克风';
    this.micButton.classList.toggle('enabled', enabled);
  }

  setVolume(volume: number): void {
    const normalized = Math.min(1, Math.max(0, volume));
    const percent = Math.round(normalized * 100);
    this.volumeSlider.value = String(percent);
    this.volumeValue.textContent = `${percent}%`;
  }
}

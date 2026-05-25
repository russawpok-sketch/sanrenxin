import type { AnimalType, TerrainType } from '@shared/types';

export type PlayerForm = AnimalType | 'runner';

type ActionKind = 'run' | 'jump' | 'climb' | 'swim' | 'smash' | 'crash';

interface ActionState {
  kind: ActionKind;
  elapsed: number;
  duration: number;
}

export class Player {
  readonly screenX = 176;
  readonly width = 58;
  readonly height = 84;
  private form: PlayerForm = 'runner';
  private action: ActionState = { kind: 'run', elapsed: 0, duration: 1 };
  private flash = 0;

  reset(): void {
    this.form = 'runner';
    this.action = { kind: 'run', elapsed: 0, duration: 1 };
    this.flash = 0;
  }

  setAnimal(animal: AnimalType): void {
    this.form = animal;
    this.flash = 0.3;
  }

  getAnimal(): PlayerForm {
    return this.form;
  }

  crash(): void {
    this.action = { kind: 'crash', elapsed: 0, duration: 1.1 };
  }

  triggerForTerrain(terrain: TerrainType, durationSeconds: number): void {
    switch (terrain) {
      case 'pit':
        this.action = { kind: 'jump', elapsed: 0, duration: 0.85 };
        break;
      case 'tree':
        this.action = { kind: 'climb', elapsed: 0, duration: 0.95 };
        break;
      case 'water':
        this.action = { kind: 'swim', elapsed: 0, duration: Math.max(0.9, durationSeconds) };
        break;
      case 'wall':
        this.action = { kind: 'smash', elapsed: 0, duration: 0.45 };
        break;
    }
  }

  update(dt: number): void {
    this.flash = Math.max(0, this.flash - dt);

    if (this.action.kind !== 'run') {
      this.action.elapsed += dt;
      if (this.action.elapsed >= this.action.duration) {
        this.action = { kind: 'run', elapsed: 0, duration: 1 };
      }
      return;
    }

    this.action.elapsed = (this.action.elapsed + dt) % 1;
  }

  draw(ctx: CanvasRenderingContext2D, groundY: number, timestamp: number): void {
    const runPhase = timestamp * 0.009;
    const { yOffset, rotation, stretch } = this.getPose(runPhase);
    const baseX = this.screenX;
    const baseY = groundY - this.height + yOffset;

    ctx.save();
    ctx.translate(baseX + this.width / 2, baseY + this.height / 2);
    ctx.rotate(rotation);
    ctx.scale(1, stretch);
    ctx.translate(-(baseX + this.width / 2), -(baseY + this.height / 2));

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, this.flash)})`;
      ctx.fillRect(baseX - 16, baseY - 12, this.width + 32, this.height + 24);
    }

    const palette = this.getPalette();
    const bob = Math.sin(runPhase * 1.7) * 2;
    const legLift = this.action.kind === 'run' ? Math.sin(runPhase * 2.5) * 8 : 0;

    ctx.fillStyle = palette.shadow;
    ctx.fillRect(baseX + 10, groundY + 8, this.width - 20, 8);

    ctx.fillStyle = palette.legs;
    ctx.fillRect(baseX + 10, baseY + 46 + bob, 12, 30 + legLift * 0.3);
    ctx.fillRect(baseX + 34, baseY + 46 + bob, 12, 30 - legLift * 0.3);

    ctx.fillStyle = palette.body;
    ctx.fillRect(baseX + 6, baseY + 20 + bob, this.width - 12, 34);

    ctx.fillStyle = palette.head;
    ctx.fillRect(baseX + 14, baseY + bob, this.width - 24, 26);

    this.drawFeatures(ctx, baseX, baseY + bob, palette);

    ctx.restore();
  }

  private getPose(runPhase: number): { yOffset: number; rotation: number; stretch: number } {
    if (this.action.kind === 'crash') {
      const progress = Math.min(1, this.action.elapsed / this.action.duration);
      return {
        yOffset: Math.sin(progress * Math.PI) * -10 + progress * 16,
        rotation: progress * 1.1,
        stretch: 1 - progress * 0.25,
      };
    }

    if (this.action.kind === 'jump') {
      const progress = Math.min(1, this.action.elapsed / this.action.duration);
      return {
        yOffset: -Math.sin(progress * Math.PI) * 122,
        rotation: -0.08 + Math.sin(progress * Math.PI) * 0.1,
        stretch: 1,
      };
    }

    if (this.action.kind === 'climb') {
      const progress = Math.min(1, this.action.elapsed / this.action.duration);
      return {
        yOffset: -Math.sin(progress * Math.PI) * 96,
        rotation: -0.22 + progress * 0.32,
        stretch: 1,
      };
    }

    if (this.action.kind === 'swim') {
      const progress = this.action.elapsed / this.action.duration;
      return {
        yOffset: 22 + Math.sin(progress * 16) * 4,
        rotation: Math.sin(progress * 10) * 0.02,
        stretch: 0.92,
      };
    }

    if (this.action.kind === 'smash') {
      const progress = Math.min(1, this.action.elapsed / this.action.duration);
      return {
        yOffset: -Math.sin(progress * Math.PI) * 20,
        rotation: Math.sin(progress * Math.PI * 2) * 0.08,
        stretch: 1 + Math.sin(progress * Math.PI) * 0.08,
      };
    }

    return {
      yOffset: Math.sin(runPhase * 1.5) * 3,
      rotation: 0,
      stretch: 1,
    };
  }

  private getPalette(): {
    body: string;
    head: string;
    legs: string;
    shadow: string;
    accent: string;
    accent2: string;
  } {
    switch (this.form) {
      case 'rooster':
        return {
          body: '#ff9f54',
          head: '#ffd2a6',
          legs: '#7c3a28',
          shadow: 'rgba(84, 33, 21, 0.28)',
          accent: '#ef4444',
          accent2: '#facc15',
        };
      case 'monkey':
        return {
          body: '#8f6e52',
          head: '#d7b48a',
          legs: '#5b412c',
          shadow: 'rgba(56, 37, 22, 0.24)',
          accent: '#b45309',
          accent2: '#f59e0b',
        };
      case 'dog':
        return {
          body: '#f2c66c',
          head: '#ffe6af',
          legs: '#855f2d',
          shadow: 'rgba(90, 57, 8, 0.22)',
          accent: '#8b5cf6',
          accent2: '#ffffff',
        };
      case 'duck':
        return {
          body: '#63d48e',
          head: '#d9ffe3',
          legs: '#197b4d',
          shadow: 'rgba(10, 92, 57, 0.22)',
          accent: '#f59e0b',
          accent2: '#fef08a',
        };
      default:
        return {
          body: '#67a7ff',
          head: '#d7e7ff',
          legs: '#243b6b',
          shadow: 'rgba(31, 46, 87, 0.22)',
          accent: '#e879f9',
          accent2: '#f8fafc',
        };
    }
  }

  private drawFeatures(
    ctx: CanvasRenderingContext2D,
    baseX: number,
    baseY: number,
    palette: {
      accent: string;
      accent2: string;
      body: string;
      head: string;
      legs: string;
      shadow: string;
    },
  ): void {
    ctx.fillStyle = '#111827';
    ctx.fillRect(baseX + 22, baseY + 8, 5, 5);
    ctx.fillRect(baseX + 31, baseY + 8, 5, 5);

    switch (this.form) {
      case 'rooster':
        ctx.fillStyle = palette.accent;
        ctx.fillRect(baseX + 18, baseY - 8, 20, 10);
        ctx.fillRect(baseX + 42, baseY + 8, 8, 8);
        ctx.fillStyle = palette.accent2;
        ctx.fillRect(baseX + 41, baseY + 14, 12, 8);
        break;
      case 'monkey':
        ctx.fillStyle = palette.accent2;
        ctx.fillRect(baseX + 8, baseY + 2, 8, 12);
        ctx.fillRect(baseX + 42, baseY + 2, 8, 12);
        ctx.fillStyle = palette.accent;
        ctx.fillRect(baseX + 48, baseY + 26, 12, 12);
        break;
      case 'dog':
        ctx.fillStyle = palette.accent;
        ctx.fillRect(baseX + 12, baseY + 2, 8, 14);
        ctx.fillRect(baseX + 38, baseY + 2, 8, 14);
        ctx.fillStyle = palette.accent2;
        ctx.fillRect(baseX + 46, baseY + 30, 12, 8);
        break;
      case 'duck':
        ctx.fillStyle = palette.accent2;
        ctx.fillRect(baseX + 13, baseY - 6, 10, 8);
        ctx.fillStyle = palette.accent;
        ctx.fillRect(baseX + 40, baseY + 14, 14, 8);
        break;
      default:
        ctx.fillStyle = palette.accent;
        ctx.fillRect(baseX + 18, baseY + 14, 22, 8);
        ctx.fillStyle = palette.accent2;
        ctx.fillRect(baseX + 20, baseY - 4, 18, 6);
        break;
    }
  }
}

import { onTransform } from '@shared/events';
import { ANIMAL_LABELS, TERRAIN_ANIMAL, TERRAIN_LABELS, type TerrainType, type TransformEvent } from '@shared/types';
import { SfxManager } from '../audio/SfxManager';
import { Level } from './Level';
import { Player } from './Player';
import { GameUI } from './GameUI';

type RunState = 'idle' | 'running' | 'gameover';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export class GameEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly player = new Player();
  private readonly level = new Level();
  private readonly particles: Particle[] = [];
  private state: RunState = 'idle';
  private lastFrame = 0;
  private worldX = 0;
  private readonly playerWorldX = this.player.screenX + 42;
  private score = 0;
  private readonly groundY = 436;
  private speed = 252;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ui: GameUI,
    private readonly sfx: SfxManager,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable.');
    }

    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    onTransform((event) => this.handleTransform(event));
  }

  startIdle(): void {
    this.level.reset();
    this.player.reset();
    this.score = 0;
    this.ui.setCurrentAnimal(this.player.getAnimal());
    this.ui.setScore(0);
    this.ui.setHint(this.level.getUpcoming(this.playerWorldX)?.type ?? null);
    this.ui.showOverlay('牲畜体验器', '按 1/2/3/4 或点按钮变身，撞墙攀树下水跳坑。', '开始游戏');
    this.lastFrame = performance.now();
    this.loop(this.lastFrame);
  }

  startNewRun(): void {
    this.state = 'running';
    this.worldX = 0;
    this.score = 0;
    this.speed = 252;
    this.particles.length = 0;
    this.level.reset();
    this.player.reset();
    this.ui.hideOverlay();
    this.ui.setCurrentAnimal(this.player.getAnimal());
    this.ui.setScore(0);
    this.ui.setHint(this.level.getUpcoming(this.playerWorldX)?.type ?? null);
    this.ui.setRoast('跑起来了，前面马上要出题。');
    this.ui.setStatus('游戏开始，留神前方提示。');
    this.sfx.playStartRun();
  }

  private loop = (timestamp: number): void => {
    const dt = Math.min(0.033, (timestamp - this.lastFrame) / 1000 || 0.016);
    this.lastFrame = timestamp;

    if (this.state === 'running') {
      this.update(dt);
    } else {
      this.player.update(dt);
      this.level.update(this.worldX);
      this.updateParticles(dt);
    }

    this.render(timestamp);
    requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.speed = Math.min(390, this.speed + dt * 5.2);
    this.worldX += this.speed * dt;
    this.score += this.speed * dt * 0.18;

    this.level.update(this.worldX);
    this.player.update(dt);
    this.updateParticles(dt);
    this.ui.setScore(this.score);

    const playerWorldFront = this.worldX + this.playerWorldX;
    const upcoming = this.level.getUpcoming(playerWorldFront);
    this.ui.setHint(upcoming && upcoming.x - playerWorldFront < 360 ? upcoming.type : null);

    for (const obstacle of this.level.obstacles) {
      if (obstacle.resolved) {
        continue;
      }

      const triggerDistance = obstacle.x - playerWorldFront;
      if (triggerDistance > 90) {
        continue;
      }

      const requiredAnimal = TERRAIN_ANIMAL[obstacle.type];
      const currentAnimal = this.player.getAnimal();
      if (currentAnimal === requiredAnimal) {
        obstacle.resolved = true;
        this.player.triggerForTerrain(obstacle.type, obstacle.width / this.speed);
        this.spawnParticles(obstacle.x - this.worldX + obstacle.width / 2, this.groundY - obstacle.height * 0.5, obstacle.type);
        this.ui.setRoast(`${ANIMAL_LABELS[requiredAnimal]}成功通过 ${TERRAIN_LABELS[obstacle.type]}。`);
        this.sfx.playTerrainSuccess(obstacle.type);
        continue;
      }

      if (triggerDistance <= 0) {
        this.failRun(obstacle.type, currentAnimal);
        return;
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 340 * dt;
      particle.life -= dt;
    }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      if (this.particles[index]!.life <= 0) {
        this.particles.splice(index, 1);
      }
    }
  }

  private failRun(terrain: TerrainType, currentAnimal: ReturnType<Player['getAnimal']>): void {
    this.state = 'gameover';
    this.player.crash();
    this.sfx.playCrash(terrain);
    const animalText = currentAnimal === 'runner' ? '空手上阵' : ANIMAL_LABELS[currentAnimal];
    this.ui.setRoast(`${animalText} 没扛住 ${TERRAIN_LABELS[terrain]}。`);
    this.ui.setStatus(`失误: ${terrain === 'wall' ? '撞墙了' : terrain === 'tree' ? '挂树上了' : terrain === 'pit' ? '掉坑里了' : '扑通下水了'}`);
    this.ui.showOverlay('翻车了', `你用 ${animalText} 去碰 ${TERRAIN_LABELS[terrain]}，按 R 或点按钮再来一局。`, '重新开始');
  }

  private handleTransform(event: TransformEvent): void {
    if (this.state === 'gameover') {
      return;
    }

    this.player.setAnimal(event.animal);
    this.ui.setCurrentAnimal(this.player.getAnimal());
    this.ui.setRoast(event.roastText);
    this.sfx.playTransform(event);
  }

  private spawnParticles(screenX: number, screenY: number, terrain: TerrainType): void {
    const palette: Record<TerrainType, string> = {
      wall: '#f6b26b',
      tree: '#9fd36b',
      pit: '#b58a5c',
      water: '#67c7ff',
    };

    for (let index = 0; index < 14; index += 1) {
      this.particles.push({
        x: screenX,
        y: screenY,
        vx: (Math.random() - 0.5) * 180,
        vy: -40 - Math.random() * 180,
        life: 0.35 + Math.random() * 0.35,
        color: palette[terrain],
      });
    }
  }

  private render(timestamp: number): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    this.drawSky(width, height, timestamp);
    this.drawMountains(width, height);
    this.drawGround(width, height, timestamp);
    this.drawObstacles(timestamp);
    this.drawParticles();
    this.player.draw(this.ctx, this.groundY, timestamp);

    if (this.state === 'idle') {
      this.drawIdlePrompt();
    }
  }

  private drawSky(width: number, height: number, timestamp: number): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.55, '#1d4ed8');
    gradient.addColorStop(1, '#7dd3fc');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    const moonX = width - 120 + Math.sin(timestamp * 0.0002) * 12;
    this.ctx.fillStyle = 'rgba(255,255,255,0.82)';
    this.ctx.fillRect(moonX, 70, 26, 26);

    for (let index = 0; index < 6; index += 1) {
      const x = ((index * 180 - this.worldX * 0.05) % (width + 240)) - 120;
      this.ctx.fillStyle = 'rgba(255,255,255,0.22)';
      this.ctx.fillRect(x, 88 + (index % 2) * 24, 76, 20);
      this.ctx.fillRect(x + 18, 74 + (index % 2) * 24, 52, 22);
    }
  }

  private drawMountains(width: number, height: number): void {
    this.ctx.fillStyle = '#13233f';
    for (let index = 0; index < 5; index += 1) {
      const x = ((index * 260 - this.worldX * 0.18) % (width + 300)) - 120;
      this.ctx.beginPath();
      this.ctx.moveTo(x, height - 104);
      this.ctx.lineTo(x + 120, height - 260 + (index % 2) * 26);
      this.ctx.lineTo(x + 250, height - 104);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawGround(width: number, height: number, timestamp: number): void {
    this.ctx.fillStyle = '#315b2d';
    this.ctx.fillRect(0, this.groundY, width, height - this.groundY);
    this.ctx.fillStyle = '#203b1b';
    this.ctx.fillRect(0, this.groundY + 20, width, 18);

    for (let x = -40; x < width + 80; x += 44) {
      const offset = (x - (this.worldX * 0.7) % 44 + 44) % 44;
      this.ctx.fillStyle = '#5f8c4a';
      this.ctx.fillRect(offset - 8, this.groundY + 6 + Math.sin((offset + timestamp * 0.02) * 0.03) * 2, 24, 6);
    }
  }

  private drawObstacles(timestamp: number): void {
    for (const obstacle of this.level.obstacles) {
      const screenX = obstacle.x - this.worldX;
      if (screenX > this.canvas.width + 180 || screenX < -220) {
        continue;
      }

      if (obstacle.type === 'wall') {
        this.drawWall(screenX, obstacle);
      } else if (obstacle.type === 'tree') {
        this.drawTree(screenX, obstacle, timestamp);
      } else if (obstacle.type === 'pit') {
        this.drawPit(screenX, obstacle);
      } else {
        this.drawWater(screenX, obstacle, timestamp);
      }
    }
  }

  private drawWall(screenX: number, obstacle: Level['obstacles'][number]): void {
    const top = this.groundY - obstacle.height;
    this.ctx.fillStyle = obstacle.resolved ? '#caa26d' : '#8f633c';
    this.ctx.fillRect(screenX, top, obstacle.width, obstacle.height);
    this.ctx.fillStyle = '#f0d9ae';
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        this.ctx.fillRect(screenX + 8 + column * 26, top + 8 + row * 24, 18, 10);
      }
    }
  }

  private drawTree(screenX: number, obstacle: Level['obstacles'][number], timestamp: number): void {
    const trunkTop = this.groundY - obstacle.height;
    this.ctx.fillStyle = '#6b4226';
    this.ctx.fillRect(screenX + 36, trunkTop + 60, 26, obstacle.height - 60);
    this.ctx.fillStyle = obstacle.resolved ? '#8bd16d' : '#4caf50';
    this.ctx.fillRect(screenX + 8, trunkTop + 12, obstacle.width - 16, 62);
    this.ctx.fillRect(screenX + 18, trunkTop - 8 + Math.sin(timestamp * 0.004) * 2, obstacle.width - 36, 26);
  }

  private drawPit(screenX: number, obstacle: Level['obstacles'][number]): void {
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(screenX, this.groundY + 2, obstacle.width, obstacle.height);
    this.ctx.fillStyle = obstacle.resolved ? '#86efac' : '#b45309';
    this.ctx.fillRect(screenX - 8, this.groundY - 6, 10, 16);
    this.ctx.fillRect(screenX + obstacle.width - 2, this.groundY - 6, 10, 16);
  }

  private drawWater(screenX: number, obstacle: Level['obstacles'][number], timestamp: number): void {
    this.ctx.fillStyle = obstacle.resolved ? '#7dd3fc' : '#38bdf8';
    this.ctx.fillRect(screenX, this.groundY + 4, obstacle.width, obstacle.height);
    this.ctx.fillStyle = '#e0f2fe';
    for (let index = 0; index < obstacle.width; index += 26) {
      this.ctx.fillRect(screenX + index, this.groundY + 8 + Math.sin((timestamp * 0.02 + index) * 0.07) * 2, 16, 4);
    }
  }

  private drawParticles(): void {
    for (const particle of this.particles) {
      this.ctx.fillStyle = particle.color;
      this.ctx.fillRect(particle.x, particle.y, 6, 6);
    }
  }

  private drawIdlePrompt(): void {
    this.ctx.fillStyle = 'rgba(7, 10, 20, 0.24)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#eff6ff';
    this.ctx.font = '700 22px sans-serif';
    this.ctx.fillText('先按开始，再用 1/2/3/4 切形态', 246, 280);
  }
}

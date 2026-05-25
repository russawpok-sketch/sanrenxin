import type { TerrainType } from '@shared/types';

export interface Obstacle {
  id: number;
  type: TerrainType;
  x: number;
  width: number;
  height: number;
  resolved: boolean;
}

const terrainDimensions: Record<TerrainType, { width: number; height: number }> = {
  wall: { width: 90, height: 110 },
  tree: { width: 110, height: 180 },
  pit: { width: 140, height: 45 },
  water: { width: 180, height: 40 },
};

const sequence: TerrainType[] = ['wall', 'water', 'tree', 'pit'];

export class Level {
  private nextId = 1;
  private nextX = 820;
  readonly obstacles: Obstacle[] = [];

  reset(): void {
    this.nextId = 1;
    this.nextX = 820;
    this.obstacles.length = 0;
    for (let index = 0; index < 8; index += 1) {
      this.appendObstacle(sequence[index % sequence.length], index);
    }
  }

  update(cameraX: number): void {
    while (this.obstacles.length > 0 && this.obstacles[0]!.x < cameraX - 320) {
      this.obstacles.shift();
    }

    while (this.nextX < cameraX + 2200) {
      this.appendObstacle(sequence[(this.nextId - 1) % sequence.length], this.nextId - 1);
    }
  }

  getUpcoming(playerWorldX: number): Obstacle | null {
    return this.obstacles.find((obstacle) => obstacle.x + obstacle.width > playerWorldX - 20) ?? null;
  }

  private appendObstacle(type: TerrainType, sequenceIndex: number): void {
    const size = terrainDimensions[type];
    const gap = 340 + (sequenceIndex % 3) * 48;
    this.obstacles.push({
      id: this.nextId,
      type,
      x: this.nextX,
      width: size.width,
      height: size.height,
      resolved: false,
    });
    this.nextId += 1;
    this.nextX += size.width + gap;
  }
}

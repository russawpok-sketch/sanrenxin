export type AnimalType = 'rooster' | 'monkey' | 'dog' | 'duck';

export type TerrainType = 'wall' | 'tree' | 'pit' | 'water';

export interface TransformEvent {
  animal: AnimalType;
  confidence: number;
  roastText: string;
  timestamp: number;
  source?: 'keyboard' | 'touch' | 'microphone';
}

export const ANIMAL_LABELS: Record<AnimalType, string> = {
  rooster: '公鸡',
  monkey: '猴子',
  dog: '狗狗',
  duck: '鸭子',
};

export const ANIMAL_HINTS: Record<AnimalType, string> = {
  rooster: '喔喔喔',
  monkey: '哦哦哦',
  dog: '汪汪',
  duck: '嘎嘎嘎',
};

export const VOICE_COMMANDS: Record<AnimalType, { primary: string; aliases: string[] }> = {
  rooster: {
    primary: '鸡',
    aliases: ['鸡', '公鸡'],
  },
  monkey: {
    primary: '猴',
    aliases: ['猴', '猴子'],
  },
  dog: {
    primary: '狗',
    aliases: ['狗', '狗狗'],
  },
  duck: {
    primary: '鸭',
    aliases: ['鸭', '鸭子'],
  },
};

export const ANIMAL_SKILLS: Record<AnimalType, string> = {
  rooster: '撞墙',
  monkey: '攀爬',
  dog: '跳坑',
  duck: '游泳',
};

export const ANIMAL_COLORS: Record<AnimalType, string> = {
  rooster: '#ff6b4a',
  monkey: '#8c6b4f',
  dog: '#f3c76a',
  duck: '#51d18b',
};

export const TERRAIN_ANIMAL: Record<TerrainType, AnimalType> = {
  wall: 'rooster',
  tree: 'monkey',
  pit: 'dog',
  water: 'duck',
};

export const TERRAIN_LABELS: Record<TerrainType, string> = {
  wall: '石墙',
  tree: '高树',
  pit: '深坑',
  water: '水池',
};

export const TERRAIN_HINTS: Record<TerrainType, string> = {
  wall: '需要公鸡撞墙',
  tree: '需要猴子攀树',
  pit: '需要狗狗跳坑',
  water: '需要鸭子下水',
};

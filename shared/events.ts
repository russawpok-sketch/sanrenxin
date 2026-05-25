import type { AnimalType, TransformEvent } from './types';

type TransformListener = (event: TransformEvent) => void;
type AnimalSoundListener = (animal: AnimalType) => void;

const transformListeners: TransformListener[] = [];
const animalSoundListeners: AnimalSoundListener[] = [];

export function emitTransform(event: TransformEvent): void {
  transformListeners.forEach((listener) => listener(event));
}

export function onTransform(callback: TransformListener): void {
  transformListeners.push(callback);
}

export function offTransform(callback: TransformListener): void {
  const index = transformListeners.indexOf(callback);
  if (index >= 0) {
    transformListeners.splice(index, 1);
  }
}

export function emitAnimalSoundDetected(animal: AnimalType): void {
  animalSoundListeners.forEach((listener) => listener(animal));
}

export function onAnimalSoundDetected(callback: AnimalSoundListener): void {
  animalSoundListeners.push(callback);
}

export function offAnimalSoundDetected(callback: AnimalSoundListener): void {
  const index = animalSoundListeners.indexOf(callback);
  if (index >= 0) {
    animalSoundListeners.splice(index, 1);
  }
}

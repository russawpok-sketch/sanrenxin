import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPRITE_DIR = path.join(__dirname, '../public/sprites');

function isBackgroundColor(r, g, b, a) {
  if (a < 16) {
    return true;
  }

  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const spread = maxC - minC;

  if (spread < 25 && minC >= 100) {
    return true;
  }
  if (maxC >= 248 && spread < 10) {
    return true;
  }
  if (maxC < 32 && spread < 18) {
    return true;
  }

  return false;
}

function floodRemoveBorderBackground(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  const tryPush = (x, y) => {
    const idx = y * width + x;
    if (visited[idx]) {
      return;
    }
    const i = idx * 4;
    if (!isBackgroundColor(data[i], data[i + 1], data[i + 2], data[i + 3])) {
      return;
    }
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (queue.length > 0) {
    const idx = queue.pop();
    const i = idx * 4;
    data[i + 3] = 0;

    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) {
      tryPush(x - 1, y);
    }
    if (x < width - 1) {
      tryPush(x + 1, y);
    }
    if (y > 0) {
      tryPush(x, y - 1);
    }
    if (y < height - 1) {
      tryPush(x, y + 1);
    }
  }
}

async function knockoutSprite(filePath) {
  const input = sharp(filePath).ensureAlpha();
  const { data, info } = await input.raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data);

  floodRemoveBorderBackground(pixels, info.width, info.height);

  const trimmed = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();

  await sharp(trimmed).toFile(`${filePath}.tmp`);
  const { rename } = await import('node:fs/promises');
  await rename(`${filePath}.tmp`, filePath);
  const meta = await sharp(filePath).metadata();
  console.log(`抠图完成: ${path.basename(filePath)} → ${meta.width}x${meta.height}`);
}

async function main() {
  await mkdir(SPRITE_DIR, { recursive: true });
  const files = (await readdir(SPRITE_DIR)).filter((f) => f.endsWith('.png'));

  for (const file of files) {
    await knockoutSprite(path.join(SPRITE_DIR, file));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

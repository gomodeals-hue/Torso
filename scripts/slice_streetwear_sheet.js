import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function cutoutTransparent(inputBuffer, outputPath) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];

  function isBackground(idx) {
    const r = data[idx * 4];
    const g = data[idx * 4 + 1];
    const b = data[idx * 4 + 2];
    return r > 240 && g > 240 && b > 240;
  }

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    if (isBackground(idx)) {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % width;
    const y = Math.floor(idx / width);
    data[idx * 4 + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  // Smooth edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      const hasNeighborBg =
        visited[(y - 1) * width + x] ||
        visited[(y + 1) * width + x] ||
        visited[y * width + (x - 1)] ||
        visited[y * width + (x + 1)];

      if (hasNeighborBg) {
        const p = idx * 4;
        const avg = (data[p] + data[p + 1] + data[p + 2]) / 3;
        if (avg > 230) {
          data[p + 3] = Math.max(0, Math.min(255, Math.round((255 - avg) * 8)));
        }
      }
    }
  }

  await sharp(data, {
    raw: { width, height, channels }
  })
    .trim()
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`Created sticker: ${path.basename(outputPath)}`);
}

async function run() {
  const sheetPath = 'C:\\Users\\wilfr\\.gemini\\antigravity-ide\\brain\\68d94877-1392-4bc8-a10d-801535858459\\streetwear_icons_sheet_1789121125420.jpg';
  const outDir = path.resolve('public/stickers');

  const crops = [
    { name: 'turbo_gt_badge.png', crop: { left: 30, top: 90, width: 440, height: 330 } },
    { name: 'chill_vibes.png', crop: { left: 540, top: 40, width: 430, height: 440 } },
    { name: 'feel_free.png', crop: { left: 40, top: 540, width: 440, height: 400 } },
    { name: 'halftone_shiba.png', crop: { left: 560, top: 520, width: 380, height: 440 } }
  ];

  for (const item of crops) {
    const buf = await sharp(sheetPath).extract(item.crop).toBuffer();
    await cutoutTransparent(buf, path.join(outDir, item.name));
  }

  console.log('All 4 companion streetwear stickers processed!');
}

run().catch(console.error);

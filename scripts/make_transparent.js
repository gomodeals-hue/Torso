import sharp from 'sharp';
import fs from 'fs';

export async function processStickerToPng(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
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
    return r > 245 && g > 245 && b > 245;
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

  // Seed image boundaries
  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % width;
    const y = Math.floor(idx / width);

    data[idx * 4 + 3] = 0; // make transparent

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  // Soft anti-alias edge
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
        if (avg > 235) {
          data[p + 3] = Math.max(0, Math.min(255, Math.round((255 - avg) * 12)));
        }
      }
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels
    }
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`Saved transparent sticker to: ${outputPath}`);
}

const input = process.argv[2];
const output = process.argv[3];
if (input && output) {
  processStickerToPng(input, output);
}

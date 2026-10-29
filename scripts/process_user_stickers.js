import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const userDir = 'C:\\Users\\wilfr\\.gemini\\antigravity-ide\\brain\\68d94877-1392-4bc8-a10d-801535858459\\.user_uploaded';
const outDir = path.resolve('public/stickers');

async function processPorsche() {
  const filePath = path.join(userDir, 'media_1789120824075.png');
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];

  function isBg(idx) {
    const r = data[idx * 4];
    const g = data[idx * 4 + 1];
    const b = data[idx * 4 + 2];
    return r >= 230 && r <= 245 && g >= 230 && g <= 245 && b >= 230 && b <= 245 && Math.abs(r - g) < 5 && Math.abs(g - b) < 5;
  }

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    if (isBg(idx)) {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }

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

  await sharp(data, { raw: { width, height, channels: 4 } })
    .trim()
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, 'porsche_911.png'));

  console.log('Processed: porsche_911.png');
}

async function processSpider() {
  const filePath = path.join(userDir, 'media_1789120830501.png');
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];

  function isBg(idx) {
    const r = data[idx * 4];
    const g = data[idx * 4 + 1];
    const b = data[idx * 4 + 2];
    return r >= 242 && r <= 252 && g >= 242 && g <= 252 && b >= 242 && b <= 252;
  }

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    if (isBg(idx)) {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }

  // Seed inner leg pockets
  enqueue(Math.round(width * 0.5), Math.round(height * 0.75));
  enqueue(Math.round(width * 0.5), Math.round(height * 0.65));

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

  await sharp(data, { raw: { width, height, channels: 4 } })
    .trim()
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, 'crimson_spider.png'));

  console.log('Processed: crimson_spider.png');
}

async function processStayWeird() {
  const filePath = path.join(userDir, 'media_1789120880377.png');
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];

  function isBg(idx) {
    const r = data[idx * 4];
    const g = data[idx * 4 + 1];
    const b = data[idx * 4 + 2];
    return r > 242 && g > 242 && b > 242;
  }

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    if (isBg(idx)) {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }

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
      const hasBgNeighbor = visited[idx - 1] || visited[idx + 1] || visited[idx - width] || visited[idx + width];
      if (hasBgNeighbor) {
        const p = idx * 4;
        const avg = (data[p] + data[p + 1] + data[p + 2]) / 3;
        if (avg > 230) {
          data[p + 3] = Math.max(0, Math.min(255, Math.round((255 - avg) * 8)));
        }
      }
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .trim()
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, 'stay_weird.png'));

  console.log('Processed: stay_weird.png');
}

async function processCat() {
  const filePath = path.join(userDir, 'media_1789120839613.png');
  // Crop slightly to remove left boundary artifact
  const cropped = await sharp(filePath)
    .extract({ left: 14, top: 0, width: 340, height: 460 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = cropped;
  const { width, height } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let alpha = 0;
    if (lum < 228) {
      alpha = Math.min(255, Math.round(Math.pow((228 - lum) / 195, 0.85) * 255));
    }

    out[i * 4] = 16;
    out[i * 4 + 1] = 16;
    out[i * 4 + 2] = 20;
    out[i * 4 + 3] = alpha;
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .trim()
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, 'halftone_cat.png'));

  console.log('Processed: halftone_cat.png');
}

async function processSocialIntrovert() {
  const filePath = path.join(userDir, 'media_1789120799522.png');
  // Crop outer 16 pixels to remove grommet dots and create a clean graphic badge with rounded corners
  const { data, info } = await sharp(filePath)
    .extract({ left: 16, top: 16, width: 690, height: 990 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const cornerRadius = 32;

  // Add rounded corners
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dx = 0;
      let dy = 0;
      if (x < cornerRadius) dx = cornerRadius - x;
      else if (x > width - cornerRadius) dx = x - (width - cornerRadius);

      if (y < cornerRadius) dy = cornerRadius - y;
      else if (y > height - cornerRadius) dy = y - (height - cornerRadius);

      if (dx > 0 && dy > 0) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cornerRadius) {
          data[(y * width + x) * 4 + 3] = 0;
        } else if (dist > cornerRadius - 1.5) {
          const fade = Math.max(0, Math.min(1, cornerRadius - dist));
          data[(y * width + x) * 4 + 3] = Math.round(fade * 255);
        }
      }
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, 'social_introvert.png'));

  console.log('Processed: social_introvert.png');
}

async function run() {
  await processPorsche();
  await processSpider();
  await processStayWeird();
  await processCat();
  await processSocialIntrovert();
  console.log('All 5 user-requested stickers processed into public/stickers successfully!');
}

run().catch(console.error);

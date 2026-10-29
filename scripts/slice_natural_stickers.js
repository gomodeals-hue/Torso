import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function cutoutTransparent(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
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

  // Seed boundaries
  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  // Flood fill
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

  // Edge smoothing
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const hasBgNeighbor =
        visited[idx - 1] ||
        visited[idx + 1] ||
        visited[idx - width] ||
        visited[idx + width];

      if (hasBgNeighbor) {
        const r = data[idx * 4];
        const g = data[idx * 4 + 1];
        const b = data[idx * 4 + 2];
        const brightness = (r + g + b) / 3;
        if (brightness > 238) {
          data[idx * 4 + 3] = Math.max(0, Math.min(255, Math.round((255 - brightness) * 16)));
        }
      }
    }
  }

  // Trim transparent pixels
  return await sharp(data, { raw: { width, height, channels: 4 } })
    .trim()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function processSheet(sheetPath, stickers) {
  const sheetMeta = await sharp(sheetPath).metadata();
  const W = sheetMeta.width;
  const H = sheetMeta.height;

  for (const s of stickers) {
    const cropLeft = Math.round(s.box[0] * W);
    const cropTop = Math.round(s.box[1] * H);
    const cropWidth = Math.round(s.box[2] * W);
    const cropHeight = Math.round(s.box[3] * H);

    const croppedBuffer = await sharp(sheetPath)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .toBuffer();

    const transparentBuffer = await cutoutTransparent(croppedBuffer);
    const outPath = path.resolve('public/stickers', `${s.id}.png`);
    fs.writeFileSync(outPath, transparentBuffer);
    console.log(`Saved transparent sticker: ${s.id}.png`);
  }
}

const sheet1Path = 'C:/Users/wilfr/.gemini/antigravity-ide/brain/36ab407c-4e57-423b-a866-4ddb40552570/natural_stickers_sheet_1789447314557.jpg';
const sheet2Path = 'C:/Users/wilfr/.gemini/antigravity-ide/brain/36ab407c-4e57-423b-a866-4ddb40552570/natural_vintage_sheet_1789447334853.jpg';

const sheet1Stickers = [
  { id: 'wildflower_bouquet', box: [0.02, 0.05, 0.31, 0.42] },
  { id: 'japanese_bonsai', box: [0.33, 0.06, 0.33, 0.40] },
  { id: 'pacific_northwest', box: [0.65, 0.05, 0.33, 0.42] },
  { id: 'celestial_butterfly', box: [0.01, 0.54, 0.37, 0.40] },
  { id: 'monstera_leaf', box: [0.38, 0.54, 0.26, 0.40] },
  { id: 'great_wave', box: [0.65, 0.54, 0.34, 0.40] },
];

const sheet2Stickers = [
  { id: 'yin_yang_koi', box: [0.03, 0.05, 0.33, 0.41] },
  { id: 'botanical_rose', box: [0.36, 0.05, 0.28, 0.42] },
  { id: 'vintage_sunburst', box: [0.64, 0.05, 0.33, 0.41] },
  { id: 'desert_cactus', box: [0.03, 0.53, 0.32, 0.42] },
  { id: 'wanderlust_compass', box: [0.34, 0.53, 0.32, 0.42] },
  { id: 'cherry_blossom', box: [0.67, 0.53, 0.30, 0.42] },
];

async function run() {
  console.log('Processing sheet 1...');
  await processSheet(sheet1Path, sheet1Stickers);
  console.log('Processing sheet 2...');
  await processSheet(sheet2Path, sheet2Stickers);
  console.log('All 12 natural stickers successfully extracted!');
}

run().catch(console.error);

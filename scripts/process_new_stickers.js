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
    // Off-white / white background (> 235)
    return r > 235 && g > 235 && b > 235;
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

  // Seed boundary
  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  // Flood fill background
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % width;
    const y = Math.floor(idx / width);

    data[idx * 4 + 3] = 0; // Transparent

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  // Edge smoothing / anti-aliasing
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
        if (avg > 225) {
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

  console.log(`Created transparent sticker: ${path.basename(outputPath)}`);
}

async function run() {
  const outDir = path.resolve('public/stickers');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const sheet4Path = 'C:\\Users\\wilfr\\.gemini\\antigravity-ide\\brain\\68d94877-1392-4bc8-a10d-801535858459\\sticker_sheet_toys_4_1789119486175.jpg';
  const sheet4Crops = [
    { name: 'vinyl_ninja.png', crop: { left: 90, top: 235, width: 275, height: 300 } },
    { name: 'astro_spaceman.png', crop: { left: 380, top: 235, width: 255, height: 300 } },
    { name: 'retro_gameboy.png', crop: { left: 660, top: 235, width: 240, height: 300 } },
    { name: 'cyber_puppy.png', crop: { left: 95, top: 545, width: 270, height: 310 } },
    { name: 'glossy_cherries.png', crop: { left: 365, top: 555, width: 275, height: 300 } },
    { name: 'rainbow_cloud.png', crop: { left: 635, top: 565, width: 270, height: 285 } }
  ];

  const sheet5Path = 'C:\\Users\\wilfr\\.gemini\\antigravity-ide\\brain\\68d94877-1392-4bc8-a10d-801535858459\\sticker_sheet_toys_5_1789119539281.jpg';
  const sheet5Crops = [
    { name: 'cyber_shiba.png', crop: { left: 25, top: 55, width: 290, height: 400 } },
    { name: 'classic_gameboy.png', crop: { left: 360, top: 65, width: 300, height: 390 } },
    { name: 'balloon_astronaut.png', crop: { left: 675, top: 55, width: 305, height: 405 } },
    { name: 'baby_dragon.png', crop: { left: 10, top: 540, width: 350, height: 340 } },
    { name: 'lightning_kicks.png', crop: { left: 345, top: 585, width: 330, height: 285 } },
    { name: 'neon_ramen.png', crop: { left: 660, top: 545, width: 330, height: 340 } }
  ];

  const sheet6Path = 'C:\\Users\\wilfr\\.gemini\\antigravity-ide\\brain\\68d94877-1392-4bc8-a10d-801535858459\\sticker_sheet_toys_6_1789119556752.jpg';
  const sheet6Crops = [
    { name: 'samurai_cat.png', crop: { left: 170, top: 55, width: 330, height: 315 } },
    { name: 'mixtape_cassette.png', crop: { left: 515, top: 55, width: 330, height: 315 } },
    { name: 'cosmic_potion.png', crop: { left: 205, top: 365, width: 280, height: 290 } },
    { name: 'pixel_trophy.png', crop: { left: 545, top: 360, width: 275, height: 290 } },
    { name: 'hologram_skull.png', crop: { left: 205, top: 645, width: 275, height: 300 } },
    { name: 'skater_bear.png', crop: { left: 550, top: 645, width: 280, height: 300 } }
  ];

  console.log('Processing Sheet 4...');
  for (const item of sheet4Crops) {
    const buf = await sharp(sheet4Path).extract(item.crop).toBuffer();
    await cutoutTransparent(buf, path.join(outDir, item.name));
  }

  console.log('Processing Sheet 5...');
  for (const item of sheet5Crops) {
    const buf = await sharp(sheet5Path).extract(item.crop).toBuffer();
    await cutoutTransparent(buf, path.join(outDir, item.name));
  }

  console.log('Processing Sheet 6...');
  for (const item of sheet6Crops) {
    const buf = await sharp(sheet6Path).extract(item.crop).toBuffer();
    await cutoutTransparent(buf, path.join(outDir, item.name));
  }

  console.log('All 18 new stickers created successfully!');
}

run().catch(console.error);

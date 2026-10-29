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
    // Any pixel near pure white (> 242)
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

  // Seed boundary
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

    data[idx * 4 + 3] = 0; // Transparent

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  // Smooth edge anti-aliasing
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
          data[p + 3] = Math.max(0, Math.min(255, Math.round((255 - avg) * 10)));
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

  console.log(`Created transparent sticker: ${outputPath}`);
}

async function run() {
  const outDir = path.resolve('public/stickers');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Sheet 1 definitions
  const sheet1Path = 'C:\\Users\\wilfr\\.gemini\\antigravity-ide\\brain\\68d94877-1392-4bc8-a10d-801535858459\\sticker_sheet_toys_1_1789107420930.jpg';
  const sheet1Crops = [
    { name: 'retro_robot.png', crop: { left: 80, top: 120, width: 280, height: 380 } },
    { name: 'astro_ducky.png', crop: { left: 370, top: 130, width: 280, height: 360 } },
    { name: 'skater_dino.png', crop: { left: 660, top: 130, width: 290, height: 360 } },
    { name: 'cyber_cat.png', crop: { left: 70, top: 520, width: 290, height: 360 } },
    { name: 'arcade_machine.png', crop: { left: 370, top: 520, width: 290, height: 350 } },
    { name: 'vinyl_bunny.png', crop: { left: 680, top: 510, width: 270, height: 370 } }
  ];

  for (const item of sheet1Crops) {
    const buf = await sharp(sheet1Path).extract(item.crop).toBuffer();
    await cutoutTransparent(buf, path.join(outDir, item.name));
  }

  // Sheet 2 definitions
  const sheet2Path = 'C:\\Users\\wilfr\\.gemini\\antigravity-ide\\brain\\68d94877-1392-4bc8-a10d-801535858459\\sticker_sheet_toys_2_1789107671630.jpg';
  const sheet2Crops = [
    { name: 'space_rocket.png', crop: { left: 80, top: 200, width: 280, height: 320 } },
    { name: 'arcade_ghost.png', crop: { left: 360, top: 210, width: 290, height: 320 } },
    { name: 'ufo_alien.png', crop: { left: 640, top: 210, width: 300, height: 310 } },
    { name: 'street_sneaker.png', crop: { left: 70, top: 620, width: 310, height: 280 } },
    { name: 'golden_star.png', crop: { left: 360, top: 610, width: 280, height: 280 } },
    { name: 'magic_mushroom.png', crop: { left: 650, top: 620, width: 290, height: 270 } }
  ];

  for (const item of sheet2Crops) {
    const buf = await sharp(sheet2Path).extract(item.crop).toBuffer();
    await cutoutTransparent(buf, path.join(outDir, item.name));
  }

  // Sheet 3 definitions
  const sheet3Path = 'C:\\Users\\wilfr\\.gemini\\antigravity-ide\\brain\\68d94877-1392-4bc8-a10d-801535858459\\sticker_sheet_toys_3_1789107698060.jpg';
  const sheet3Crops = [
    { name: 'golden_gamepad.png', crop: { left: 90, top: 230, width: 290, height: 250 } },
    { name: 'crystal_heart.png', crop: { left: 380, top: 250, width: 260, height: 230 } },
    { name: 'street_boombox.png', crop: { left: 640, top: 230, width: 280, height: 250 } },
    { name: 'skater_skull.png', crop: { left: 100, top: 540, width: 270, height: 310 } },
    { name: 'melting_smiley.png', crop: { left: 390, top: 550, width: 240, height: 300 } },
    { name: 'boba_cup.png', crop: { left: 670, top: 540, width: 230, height: 310 } }
  ];

  for (const item of sheet3Crops) {
    const buf = await sharp(sheet3Path).extract(item.crop).toBuffer();
    await cutoutTransparent(buf, path.join(outDir, item.name));
  }

  console.log('All 18 sheet stickers processed successfully!');
}

run().catch(console.error);

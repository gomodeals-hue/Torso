import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const frontPath = 'C:/Users/wilfr/.gemini/antigravity-ide/brain/ad0fc0fd-a50f-4f7b-85e4-171625c7dd30/fullhand_front_raw_1789445281888.jpg';
const backPath = 'C:/Users/wilfr/.gemini/antigravity-ide/brain/ad0fc0fd-a50f-4f7b-85e4-171625c7dd30/fullhand_back_raw_1789445302016.jpg';

async function processMockup(inputPath, outName) {
  const outputPath = path.resolve('public/mockups', outName + '.png');
  const { data, info } = await sharp(inputPath).resize(1024, 1024).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];

  const threshold = 238;

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const p = idx * 3;
    if (data[p] >= threshold && data[p + 1] >= threshold && data[p + 2] >= threshold) {
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

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  const outData = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIn = idx * 3;
      const pOut = idx * 4;

      if (visited[idx]) {
        outData[pOut] = 255;
        outData[pOut + 1] = 255;
        outData[pOut + 2] = 255;
        outData[pOut + 3] = 0;
      } else {
        outData[pOut] = data[pIn];
        outData[pOut + 1] = data[pIn + 1];
        outData[pOut + 2] = data[pIn + 2];

        const hasBgNeighbor =
          (x > 0 && visited[idx - 1]) ||
          (x < width - 1 && visited[idx + 1]) ||
          (y > 0 && visited[idx - width]) ||
          (y < height - 1 && visited[idx + width]);

        if (hasBgNeighbor) {
          const avg = (data[pIn] + data[pIn + 1] + data[pIn + 2]) / 3;
          if (avg > 235) {
            outData[pOut + 3] = Math.max(0, Math.min(255, Math.round((255 - avg) * 12)));
          } else {
            outData[pOut + 3] = 255;
          }
        } else {
          outData[pOut + 3] = 255;
        }
      }
    }
  }

  await sharp(outData, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log('Saved transparent mockup:', outputPath);
}

await processMockup(frontPath, 'fullhand_front');
await processMockup(backPath, 'fullhand_back');
console.log('Full hand mockups processed successfully!');

// Photorealistic T-Shirt Engine with Customizable Styles & Collar Options

export type TshirtStyle = 'crewneck' | 'polo' | 'vneck' | 'fullhand';

export interface StyleOption {
  id: TshirtStyle;
  name: string;
  hasCollar: boolean;
  badge: string;
  description: string;
  frontImg: string;
  backImg: string;
}

export const APPAREL_STYLES: StyleOption[] = [
  {
    id: 'crewneck',
    name: 'Classic Crewneck',
    hasCollar: false,
    badge: 'Without Collar',
    description: 'Timeless round ribbed collar with seamless shoulders and relaxed fit.',
    frontImg: '/mockups/crew_front.png',
    backImg: '/mockups/crew_back.png'
  },
  {
    id: 'fullhand',
    name: 'Full Hand Long Sleeve',
    hasCollar: false,
    badge: 'Full Hand / Long Sleeve',
    description: 'Heavyweight full-sleeve cotton tee with ribbed cuffs and relaxed streetwear drape.',
    frontImg: '/mockups/fullhand_front.png',
    backImg: '/mockups/fullhand_back.png'
  },
  {
    id: 'polo',
    name: 'Polo Shirt',
    hasCollar: true,
    badge: 'With Collar',
    description: 'Folded rib-knit collar with classic two-button placket and piqué cotton drape.',
    frontImg: '/mockups/polo_front.png',
    backImg: '/mockups/polo_back.png'
  },
  {
    id: 'vneck',
    name: 'Sport V-Neck',
    hasCollar: false,
    badge: 'Without Collar',
    description: 'Sharp, tailored V-neck cut collar with modern contoured drape.',
    frontImg: '/mockups/vneck_front.png',
    backImg: '/mockups/crew_back.png'
  }
];

// Printable boundary area in 600x680 coordinate space
export const PRINT_ZONES: Record<TshirtStyle, { x: number; y: number; width: number; height: number }> = {
  fullhand: {
    x: 180,
    y: 165,
    width: 240,
    height: 380
  },
  crewneck: {
    x: 180,
    y: 160,
    width: 240,
    height: 380
  },
  polo: {
    x: 185,
    y: 220, // lower top because of collar and button placket
    width: 230,
    height: 340
  },
  vneck: {
    x: 180,
    y: 200, // lower top because of V-neck plunge
    width: 240,
    height: 350
  }
};

export const PRINT_ZONE = PRINT_ZONES.crewneck;

export function getTshirtSvg(_view: 'front' | 'back', colorHex: string): string {
  // SVG representation fallback
  return `<svg viewBox="0 0 600 680" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${colorHex}"/></svg>`;
}

interface ProcessedMockup {
  silhouetteCanvas: HTMLCanvasElement; // Isolated shirt alpha mask
  textureCanvas: HTMLCanvasElement;    // Grayscale wrinkles & shading
  width: number;
  height: number;
  baseLuminance: number;               // Natural flat cotton luminance (~234)
}

const mockupCache = new Map<string, ProcessedMockup>();
// Cache tinted canvas per image URL and color hex
const tintCache = new Map<string, HTMLCanvasElement>();

/**
 * Parses hex color string (#fff, #ffffff, #ffffff80) into [r, g, b] numbers
 */
function parseHexColor(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return [r, g, b];
    }
  }
  return [255, 255, 255];
}

/**
 * Loads and processes a mockup photograph into an isolated transparent mask + texture map.
 */
export async function loadAndProcessMockup(imgUrl: string): Promise<ProcessedMockup> {
  if (mockupCache.has(imgUrl)) {
    return mockupCache.get(imgUrl)!;
  }

  const img = await loadImage(imgUrl);
  const width = img.naturalWidth || 1024;
  const height = img.naturalHeight || 1024;

  // 1. Create silhouette canvas (extract transparent background)
  const silCanvas = document.createElement('canvas');
  silCanvas.width = width;
  silCanvas.height = height;
  const silCtx = silCanvas.getContext('2d', { willReadFrequently: true })!;
  silCtx.drawImage(img, 0, 0);

  const imgData = silCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Check if image already has native transparent pixels (from our pre-cutout PNGs)
  let hasNativeAlpha = false;
  for (let i = 3; i < data.length; i += 40) {
    if (data[i] === 0) {
      hasNativeAlpha = true;
      break;
    }
  }

  if (!hasNativeAlpha) {
    // Fallback safe background flood-fill with high threshold (250) to prevent shoulder leakage
    const visited = new Uint8Array(width * height);
    const queue: number[] = [];

    function checkAndEnqueue(x: number, y: number) {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const idx = y * width + x;
      if (visited[idx]) return;

      const p = idx * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];

      if (r >= 250 && g >= 250 && b >= 250) {
        visited[idx] = 1;
        queue.push(idx);
      }
    }

    for (let x = 0; x < width; x++) {
      checkAndEnqueue(x, 0);
      checkAndEnqueue(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      checkAndEnqueue(0, y);
      checkAndEnqueue(width - 1, y);
    }

    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      const cx = idx % width;
      const cy = Math.floor(idx / width);
      data[idx * 4 + 3] = 0;

      checkAndEnqueue(cx + 1, cy);
      checkAndEnqueue(cx - 1, cy);
      checkAndEnqueue(cx, cy + 1);
      checkAndEnqueue(cx, cy - 1);
    }

    silCtx.putImageData(imgData, 0, 0);
  }

  // Calculate the average luminance of flat cotton fabric (sampling non-transparent chest region)
  let chestLumSum = 0;
  let chestPixelCount = 0;
  const startX = Math.round(width * 0.35);
  const endX = Math.round(width * 0.65);
  const startY = Math.round(height * 0.35);
  const endY = Math.round(height * 0.65);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 200) {
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        chestLumSum += lum;
        chestPixelCount++;
      }
    }
  }
  const baseLuminance = chestPixelCount > 0 ? Math.round(chestLumSum / chestPixelCount) : 234;

  // 2. Texture canvas
  const texCanvas = document.createElement('canvas');
  texCanvas.width = width;
  texCanvas.height = height;
  const texCtx = texCanvas.getContext('2d')!;
  texCtx.drawImage(silCanvas, 0, 0);

  const processed: ProcessedMockup = {
    silhouetteCanvas: silCanvas,
    textureCanvas: texCanvas,
    width,
    height,
    baseLuminance
  };

  mockupCache.set(imgUrl, processed);
  return processed;
}

/**
 * Creates or retrieves a cached photorealistic tinted garment canvas.
 * Perfectly matches target swatch color on flat cotton while preserving 3D folds & highlights.
 */
function getTintedGarmentCanvas(mockup: ProcessedMockup, imgUrl: string, colorHex: string): HTMLCanvasElement {
  const normHex = colorHex.toLowerCase();
  const cacheKey = `${imgUrl}_${normHex}`;
  if (tintCache.has(cacheKey)) {
    return tintCache.get(cacheKey)!;
  }

  const { width, height, silhouetteCanvas, baseLuminance } = mockup;
  const tintedCanvas = document.createElement('canvas');
  tintedCanvas.width = width;
  tintedCanvas.height = height;
  const ctx = tintedCanvas.getContext('2d', { willReadFrequently: true })!;

  // Copy photographic shirt
  ctx.drawImage(silhouetteCanvas, 0, 0);

  const isWhite = normHex === '#ffffff' || normHex === '#fff';
  if (isWhite) {
    // For pure white, the raw studio photography is already natural white cotton!
    tintCache.set(cacheKey, tintedCanvas);
    return tintedCanvas;
  }

  const [targetR, targetG, targetB] = parseHexColor(normHex);
  const isVeryDark = targetR < 40 && targetG < 40 && targetB < 40; // Onyx, Deep Charcoal

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;

    const origR = data[i];
    const origG = data[i + 1];
    const origB = data[i + 2];

    // Compute original pixel luminance from the white shirt photo
    const lum = 0.299 * origR + 0.587 * origG + 0.114 * origB;
    const ratio = lum / baseLuminance;

    if (isVeryDark) {
      // For rich black / dark fabrics: preserve creases and provide soft fold specular highlights
      if (ratio <= 1.0) {
        const factor = Math.pow(ratio, 1.35);
        data[i] = Math.round(targetR * factor);
        data[i + 1] = Math.round(targetG * factor);
        data[i + 2] = Math.round(targetB * factor);
      } else {
        // Highlight along ribbing & seams
        const hl = Math.min(1.0, (ratio - 1.0) / (255 / baseLuminance - 1.0 + 0.001));
        const boost = hl * 40;
        data[i] = Math.min(255, Math.round(targetR + boost));
        data[i + 1] = Math.min(255, Math.round(targetG + boost));
        data[i + 2] = Math.min(255, Math.round(targetB + boost));
      }
    } else {
      // Standard & Vibrant Colors (Cyan, Crimson, Butter Yellow, Mint, Violet, Orange, etc.)
      if (ratio <= 1.0) {
        // Fabric creases and shadows: smooth power curve from flat color down into crease depth
        // At ratio = 1.0 (flat fabric), factor is exactly 1.0 -> 100% exact target swatch RGB!
        const factor = Math.pow(ratio, 1.2);
        data[i] = Math.round(targetR * factor);
        data[i + 1] = Math.round(targetG * factor);
        data[i + 2] = Math.round(targetB * factor);
      } else {
        // Specular reflections and light glints on seams
        const hl = Math.min(1.0, (ratio - 1.0) / (255 / baseLuminance - 1.0 + 0.001));
        data[i] = Math.round(targetR + (255 - targetR) * hl * 0.72);
        data[i + 1] = Math.round(targetG + (255 - targetG) * hl * 0.72);
        data[i + 2] = Math.round(targetB + (255 - targetB) * hl * 0.72);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  tintCache.set(cacheKey, tintedCanvas);
  return tintedCanvas;
}

/**
 * Renders a photorealistic tinted T-shirt onto a target canvas with exact swatch color fidelity.
 */
export async function renderPhotorealisticTshirt(
  targetCanvas: HTMLCanvasElement,
  style: TshirtStyle,
  view: 'front' | 'back',
  colorHex: string
): Promise<void> {
  const styleDef = APPAREL_STYLES.find(s => s.id === style) || APPAREL_STYLES[0];
  const imgUrl = view === 'front' ? styleDef.frontImg : styleDef.backImg;

  const mockup = await loadAndProcessMockup(imgUrl);
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const w = targetCanvas.width;
  const h = targetCanvas.height;
  ctx.clearRect(0, 0, w, h);

  // 1. Soft Photorealistic Floor & Drop Shadow (Kept isolated so it is NEVER tinted)
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 16;
  ctx.drawImage(mockup.silhouetteCanvas, 0, 0, w, h);
  ctx.restore();

  // 2. Draw Tinted T-shirt on top (Standard source-over blending preserves pure shadow beneath)
  const tintedCanvas = getTintedGarmentCanvas(mockup, imgUrl, colorHex);
  ctx.drawImage(tintedCanvas, 0, 0, w, h);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}


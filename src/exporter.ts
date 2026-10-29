import type { TshirtEditor } from './editor';

export async function exportTshirtImage(editor: TshirtEditor, transparentBg: boolean = false): Promise<void> {
  const width = 2048;
  const height = 2048;

  // 1. Capture high-res 3D WebGL render directly from the Three.js viewport
  const threeScene = editor.getThreeScene();
  const threeDataUrl = threeScene.captureRender(width, height);
  const threeImg = await loadRasterImage(threeDataUrl);

  // 2. Composite into final output canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  if (!transparentBg) {
    const bgGrad = ctx.createRadialGradient(width / 2, height * 0.42, 100, width / 2, height * 0.42, width * 0.9);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.5, '#f8fafc');
    bgGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle studio floor grid lines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.035)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  // Draw 3D Shirt Render
  ctx.drawImage(threeImg, 0, 0, width, height);

  // Studio Brand Stamp & Specs
  const state = editor.getState();
  if (!transparentBg) {
    ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(`TORSO™ STUDIO // 3D WORKBENCH`, 70, height - 70);

    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(100, 116, 139, 0.85)';
    ctx.fillText(`ROTATION X:${state.angles.pitch}° Y:${state.angles.yaw}° Z:${state.angles.roll}° • COLOR: ${state.shirtColor.toUpperCase()}`, 70, height - 36);

    ctx.textAlign = 'right';
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillText(`${state.currentSide.toUpperCase()} VIEW • ${new Date().toLocaleDateString()}`, width - 70, height - 70);
  }

  // Trigger Instant Download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `torso-3d-${state.shirtStyle}-${state.currentSide}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

function loadRasterImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function buildFullBleedOldStyle() {
  const src = 'C:/Users/NEXT Speed/.gemini/antigravity-ide/brain/dc99d4bc-db4d-4b4a-9a17-dd5da33b3ad1/richmenu_flat_graphic_1792119868632.jpg';
  
  const WIDTH = 2500;
  const HEIGHT = 1686;
  const HALF_W = 1250;
  const HALF_H = 843;

  // In each card in src, inner content is within ~20px inset from edges:
  // Q1: left: 325, top: 121, width: 286, height: 288
  // Q2: left: 651, top: 121, width: 285, height: 288
  // Q3: left: 325, top: 449, width: 286, height: 288
  // Q4: left: 651, top: 449, width: 285, height: 288

  // We resize the content to 700x700 with Lanczos3
  const targetSize = 700;

  const q1Content = await sharp(src)
    .extract({ left: 325, top: 121, width: 286, height: 288 })
    .resize(targetSize, targetSize, { kernel: 'lanczos3' })
    .toBuffer();

  const q2Content = await sharp(src)
    .extract({ left: 651, top: 121, width: 285, height: 288 })
    .resize(targetSize, targetSize, { kernel: 'lanczos3' })
    .toBuffer();

  const q3Content = await sharp(src)
    .extract({ left: 325, top: 449, width: 286, height: 288 })
    .resize(targetSize, targetSize, { kernel: 'lanczos3' })
    .toBuffer();

  const q4Content = await sharp(src)
    .extract({ left: 651, top: 449, width: 285, height: 288 })
    .resize(targetSize, targetSize, { kernel: 'lanczos3' })
    .toBuffer();

  // Create solid background quadrants matching the exact RGB colors
  const q1Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 21, g: 97, b: 195 } } })
    .composite([{ input: q1Content, top: Math.round((HALF_H - targetSize) / 2), left: Math.round((HALF_W - targetSize) / 2) }])
    .png()
    .toBuffer();

  const q2Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 24, g: 168, b: 218 } } })
    .composite([{ input: q2Content, top: Math.round((HALF_H - targetSize) / 2), left: Math.round((HALF_W - targetSize) / 2) }])
    .png()
    .toBuffer();

  const q3Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 7, g: 174, b: 122 } } })
    .composite([{ input: q3Content, top: Math.round((HALF_H - targetSize) / 2), left: Math.round((HALF_W - targetSize) / 2) }])
    .png()
    .toBuffer();

  const q4Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 244, g: 91, b: 83 } } })
    .composite([{ input: q4Content, top: Math.round((HALF_H - targetSize) / 2), left: Math.round((HALF_W - targetSize) / 2) }])
    .png()
    .toBuffer();

  const dividerSvg = `<svg width="2500" height="1686" xmlns="http://www.w3.org/2000/svg">
    <line x1="1250" y1="0" x2="1250" y2="1686" stroke="white" stroke-width="3" stroke-opacity="0.3" />
    <line x1="0" y1="843" x2="2500" y2="843" stroke="white" stroke-width="3" stroke-opacity="0.3" />
  </svg>`;

  // Master Composite
  const outputPath = path.join(rootDir, 'public', 'richmenu.jpg');
  await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([
      { input: q1Bg, left: 0, top: 0 },
      { input: q2Bg, left: HALF_W, top: 0 },
      { input: q3Bg, left: 0, top: HALF_H },
      { input: q4Bg, left: HALF_W, top: HALF_H },
      { input: Buffer.from(dividerSvg), left: 0, top: 0 }
    ])
    .jpeg({ quality: 95 })
    .toFile(outputPath);

  console.log(`✅ Successfully generated full-bleed rich menu with old aesthetic: ${outputPath}`);
}

buildFullBleedOldStyle().catch(console.error);

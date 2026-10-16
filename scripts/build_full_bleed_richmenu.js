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

  // Exact coordinates of the 4 full cards (preserving all text, including 'ย์' in ตารางเวรแพทย์):
  // Q1 Blue: 308, 101, 331, 338
  // Q2 Cyan: 625, 101, 330, 338
  // Q3 Green: 308, 420, 331, 338
  // Q4 Red: 625, 420, 330, 338

  async function extractAndClean(rect, bgColor, outerCorner) {
    const { data, info } = await sharp(src)
      .extract(rect)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Clean outer corners of gray pixels without touching any text or icons
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const isNearOuterCorner = 
          (outerCorner === 'top-left' && x < 28 && y < 28) ||
          (outerCorner === 'top-right' && x > info.width - 28 && y < 28) ||
          (outerCorner === 'bottom-left' && x < 28 && y > info.height - 28) ||
          (outerCorner === 'bottom-right' && x > info.width - 28 && y > info.height - 28);

        if (isNearOuterCorner) {
          const idx = (y * info.width + x) * 3;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          const isGray = (Math.abs(r - g) < 22 && Math.abs(g - b) < 22 && Math.abs(r - b) < 22 && r > 190);
          if (isGray) {
            data[idx] = bgColor.r;
            data[idx + 1] = bgColor.g;
            data[idx + 2] = bgColor.b;
          }
        }
      }
    }

    // Resize cleanly to fit proportionally in 1250 x 843
    // Target height ~740px (width will be ~725px), giving generous padding and 0 cutoff
    return await sharp(data, { raw: info })
      .resize({ height: 750, fit: 'contain', kernel: 'lanczos3' })
      .toBuffer({ resolveWithObject: true });
  }

  const q1 = await extractAndClean({ left: 308, top: 101, width: 331, height: 338 }, { r: 21, g: 97, b: 195 }, 'top-left');
  const q2 = await extractAndClean({ left: 625, top: 101, width: 330, height: 338 }, { r: 24, g: 168, b: 218 }, 'top-right');
  const q3 = await extractAndClean({ left: 308, top: 420, width: 331, height: 338 }, { r: 7, g: 174, b: 122 }, 'bottom-left');
  const q4 = await extractAndClean({ left: 625, top: 420, width: 330, height: 338 }, { r: 244, g: 91, b: 83 }, 'bottom-right');

  // Create solid background quadrants matching the exact RGB colors
  const q1Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 21, g: 97, b: 195 } } })
    .composite([{ input: q1.data, raw: q1.info, top: Math.round((HALF_H - q1.info.height) / 2), left: Math.round((HALF_W - q1.info.width) / 2) }])
    .png()
    .toBuffer();

  const q2Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 24, g: 168, b: 218 } } })
    .composite([{ input: q2.data, raw: q2.info, top: Math.round((HALF_H - q2.info.height) / 2), left: Math.round((HALF_W - q2.info.width) / 2) }])
    .png()
    .toBuffer();

  const q3Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 7, g: 174, b: 122 } } })
    .composite([{ input: q3.data, raw: q3.info, top: Math.round((HALF_H - q3.info.height) / 2), left: Math.round((HALF_W - q3.info.width) / 2) }])
    .png()
    .toBuffer();

  const q4Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 244, g: 91, b: 83 } } })
    .composite([{ input: q4.data, raw: q4.info, top: Math.round((HALF_H - q4.info.height) / 2), left: Math.round((HALF_W - q4.info.width) / 2) }])
    .png()
    .toBuffer();

  const dividerSvg = `<svg width="2500" height="1686" xmlns="http://www.w3.org/2000/svg">
    <line x1="1250" y1="0" x2="1250" y2="1686" stroke="white" stroke-width="3" stroke-opacity="0.35" />
    <line x1="0" y1="843" x2="2500" y2="843" stroke="white" stroke-width="3" stroke-opacity="0.35" />
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

  console.log(`✅ Successfully generated full-bleed rich menu with old aesthetic (Full text & intact 'ย์'): ${outputPath}`);
}

buildFullBleedOldStyle().catch(console.error);

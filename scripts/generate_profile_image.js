import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const SIZE = 1000;

async function generate() {
  console.log(`🎨 Rendering Official LINE OA Profile Avatar (${SIZE}x${SIZE}px) with REAL BSI Vector Logo...`);
  const destPath = path.join(rootDir, 'public', 'bsi_profile.png');
  const svgPath = path.join(rootDir, 'public', 'official_bsi_logo.svg');

  if (!fs.existsSync(svgPath)) {
    console.error(`❌ Official logo SVG not found at ${svgPath}`);
    return;
  }

  // 1. Render the authentic official logo into PNG at 820px width
  const svgBuffer = fs.readFileSync(svgPath);
  const logoPng = await sharp(svgBuffer)
    .resize(800)
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoPng).metadata();

  // 2. Hospital Ring & Badging SVG overlay
  const badgeSvg = `
  <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <!-- Clean white circular background -->
    <circle cx="500" cy="500" r="498" fill="#ffffff" />
    
    <!-- Authentic Hospital Navy Outer Ring -->
    <circle cx="500" cy="500" r="486" fill="none" stroke="#002d74" stroke-width="12" stroke-opacity="0.1" />
    <circle cx="500" cy="500" r="472" fill="none" stroke="#002d74" stroke-width="4" stroke-opacity="0.75" />

    <!-- Subtitle Badge at bottom -->
    <g transform="translate(500, 780)">
      <rect x="-240" y="-30" width="480" height="60" rx="30" fill="#002d74" />
      <text x="0" y="10" text-anchor="middle" font-family="'Sarabun', 'Arial', sans-serif" font-size="28" font-weight="bold" fill="#ffffff" letter-spacing="2">
        DOCTOR LEAVE SYSTEM
      </text>
    </g>
  </svg>
  `;

  // 3. Composite everything cleanly
  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    { input: Buffer.from(badgeSvg), left: 0, top: 0 },
    {
      input: logoPng,
      left: Math.round((SIZE - logoMeta.width) / 2),
      top: Math.round((SIZE - logoMeta.height) / 2) - 40 // Centered slightly higher to balance badge
    }
  ])
  .png()
  .toFile(destPath);

  console.log(`✅ Official Profile Image successfully generated at: ${destPath}`);
}

generate().catch(console.error);

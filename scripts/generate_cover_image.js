import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const WIDTH = 1200;
const HEIGHT = 750;

async function generateCover() {
  console.log(`🎨 Rendering Official BSI LINE Profile Cover (${WIDTH}x${HEIGHT}px)...`);
  const destPath = path.join(rootDir, 'public', 'bsi_cover.png');
  const svgPath = path.join(rootDir, 'public', 'official_bsi_logo.svg');

  // 1. Render official SVG logo at width 420px
  const svgBuffer = fs.readFileSync(svgPath);
  const logoPng = await sharp(svgBuffer)
    .resize(420)
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoPng).metadata();

  // 2. Base SVG with Hospital Gradient, Medical Cross patterns, and Corporate Aesthetics
  const bgSvg = `
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#001845" />
        <stop offset="50%" stop-color="#002d74" />
        <stop offset="100%" stop-color="#004b93" />
      </linearGradient>

      <linearGradient id="accent-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#b12028" />
        <stop offset="100%" stop-color="#ef4444" />
      </linearGradient>

      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="0.75" stroke-opacity="0.05"/>
      </pattern>

      <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000" flood-opacity="0.25" />
      </filter>
    </defs>

    <!-- Background Gradient -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg-grad)" />
    <!-- Grid Overlay -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)" />

    <!-- Abstract Medical Glow Rings -->
    <circle cx="1100" cy="100" r="350" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.12" />
    <circle cx="1100" cy="100" r="220" fill="none" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.15" />
    <circle cx="100" cy="650" r="300" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.06" />

    <!-- Accent Color Stripe at Top -->
    <rect x="0" y="0" width="${WIDTH}" height="6" fill="url(#accent-grad)" />

    <!-- Center Card Base for Logo -->
    <g transform="translate(600, 290)" filter="url(#card-shadow)">
      <rect x="-260" y="-100" width="520" height="200" rx="24" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
    </g>

    <!-- Typography: Title & Subtitle below card -->
    <text x="600" y="470" text-anchor="middle" font-family="'Sarabun', 'Arial', sans-serif" font-size="34" font-weight="bold" fill="#ffffff" letter-spacing="1">
      ระบบบริหารการลาแพทย์ (Doctor Leave System)
    </text>
    <text x="600" y="520" text-anchor="middle" font-family="'Sarabun', 'Noto Sans Thai', sans-serif" font-size="22" font-weight="500" fill="#93c5fd" letter-spacing="0.5">
      โรงพยาบาลกรุงเทพศิริโรจน์ • Bangkok Hospital Siriroj
    </text>

    <!-- Bottom Badges -->
    <g transform="translate(600, 590)">
      <rect x="-210" y="-20" width="420" height="40" rx="20" fill="#ffffff" fill-opacity="0.1" stroke="#ffffff" stroke-width="1" stroke-opacity="0.2" />
      <text x="0" y="7" text-anchor="middle" font-family="'Sarabun', 'Arial', sans-serif" font-size="16" font-weight="600" fill="#e0f2fe" letter-spacing="1.5">
        BDMS NETWORK • PHUKET, THAILAND
      </text>
    </g>
  </svg>
  `;

  // 3. Composite everything cleanly
  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 0, g: 45, b: 116, alpha: 1 }
    }
  })
  .composite([
    { input: Buffer.from(bgSvg), left: 0, top: 0 },
    {
      input: logoPng,
      left: Math.round((WIDTH - logoMeta.width) / 2),
      top: 290 - Math.round(logoMeta.height / 2)
    }
  ])
  .png()
  .toFile(destPath);

  console.log(`✅ Cover image successfully generated at: ${destPath}`);
}

generateCover().catch(console.error);

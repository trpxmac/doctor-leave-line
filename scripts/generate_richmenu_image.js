import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const WIDTH = 2500;
const HEIGHT = 1686;
const HALF_W = 1250;
const HALF_H = 843;

// SVG Definition of 100% Full Bleed Rich Menu with Hospital Brand Aesthetics
const svgMarkup = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradients -->
    <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#006699" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <linearGradient id="grad-sky" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0ea5e9" />
    </linearGradient>

    <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>

    <linearGradient id="grad-rose" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#dc2626" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>

    <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#000000" flood-opacity="0.15" />
    </filter>

    <filter id="icon-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0f172a" />

  <!-- ==================== QUADRANT 1: ยื่นใบลา (TOP-LEFT) ==================== -->
  <g id="btn-request">
    <rect x="0" y="0" width="${HALF_W}" height="${HALF_H}" fill="url(#grad-blue)" />
    <!-- Inner Card Effect -->
    <rect x="24" y="24" width="${HALF_W - 48}" height="${HALF_H - 48}" rx="36" fill="white" fill-opacity="0.08" stroke="white" stroke-width="4" stroke-opacity="0.2" filter="url(#card-shadow)" />
    
    <!-- Icon: Calendar with Checkmark -->
    <g transform="translate(625, 340) scale(3.2)" filter="url(#icon-glow)">
      <!-- Calendar Body -->
      <rect x="-35" y="-35" width="70" height="70" rx="14" fill="white" fill-opacity="0.2" stroke="white" stroke-width="4.5" />
      <!-- Rings -->
      <rect x="-22" y="-45" width="8" height="18" rx="4" fill="white" />
      <rect x="14" y="-45" width="8" height="18" rx="4" fill="white" />
      <!-- Grid Lines -->
      <line x1="-35" y1="-12" x2="35" y2="-12" stroke="white" stroke-width="3.5" />
      <!-- Checkmark -->
      <path d="M-15 10 L-4 20 L 18 -2" fill="none" stroke="white" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- Text Label -->
    <text x="625" y="600" text-anchor="middle" font-family="'Sarabun', 'Noto Sans Thai', 'Thonburi', sans-serif" font-size="78" font-weight="bold" fill="#ffffff" letter-spacing="1">
      ยื่นใบลา
    </text>
    <text x="625" y="670" text-anchor="middle" font-family="'Sarabun', 'Noto Sans Thai', sans-serif" font-size="36" font-weight="500" fill="#bae6fd" letter-spacing="1">
      Request Doctor Leave
    </text>
  </g>

  <!-- ==================== QUADRANT 2: ประวัติ & สิทธิ์คงเหลือ (TOP-RIGHT) ==================== -->
  <g id="btn-history">
    <rect x="${HALF_W}" y="0" width="${HALF_W}" height="${HALF_H}" fill="url(#grad-sky)" />
    <!-- Inner Card Effect -->
    <rect x="${HALF_W + 24}" y="24" width="${HALF_W - 48}" height="${HALF_H - 48}" rx="36" fill="white" fill-opacity="0.08" stroke="white" stroke-width="4" stroke-opacity="0.2" filter="url(#card-shadow)" />

    <!-- Icon: Clock History -->
    <g transform="translate(${HALF_W + 625}, 340) scale(3.2)" filter="url(#icon-glow)">
      <!-- Clock Face -->
      <circle cx="0" cy="0" r="35" fill="white" fill-opacity="0.2" stroke="white" stroke-width="4.5" />
      <!-- Hands -->
      <line x1="0" y1="0" x2="0" y2="-18" stroke="white" stroke-width="5" stroke-linecap="round" />
      <line x1="0" y1="0" x2="14" y2="0" stroke="white" stroke-width="5" stroke-linecap="round" />
      <!-- History Arrow Ribbon -->
      <path d="M-28 -18 A 34 34 0 0 0 -35 0" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" />
      <polygon points="-26,-28 -28,-14 -14,-18" fill="white" />
    </g>

    <!-- Text Label -->
    <text x="${HALF_W + 625}" y="600" text-anchor="middle" font-family="'Sarabun', 'Noto Sans Thai', 'Thonburi', sans-serif" font-size="78" font-weight="bold" fill="#ffffff" letter-spacing="1">
      ประวัติ &amp; สิทธิ์คงเหลือ
    </text>
    <text x="${HALF_W + 625}" y="670" text-anchor="middle" font-family="'Sarabun', 'Noto Sans Thai', sans-serif" font-size="36" font-weight="500" fill="#e0f2fe" letter-spacing="1">
      Leave History &amp; Quotas
    </text>
  </g>

  <!-- ==================== QUADRANT 3: ตารางเวรแพทย์ (BOTTOM-LEFT) ==================== -->
  <g id="btn-shifts">
    <rect x="0" y="${HALF_H}" width="${HALF_W}" height="${HALF_H}" fill="url(#grad-emerald)" />
    <!-- Inner Card Effect -->
    <rect x="24" y="${HALF_H + 24}" width="${HALF_W - 48}" height="${HALF_H - 48}" rx="36" fill="white" fill-opacity="0.08" stroke="white" stroke-width="4" stroke-opacity="0.2" filter="url(#card-shadow)" />

    <!-- Icon: Medical Roster / Clipboard -->
    <g transform="translate(625, ${HALF_H + 340}) scale(3.2)" filter="url(#icon-glow)">
      <!-- Board -->
      <rect x="-26" y="-34" width="52" height="68" rx="8" fill="white" fill-opacity="0.2" stroke="white" stroke-width="4.5" />
      <!-- Clip -->
      <rect x="-14" y="-40" width="28" height="12" rx="4" fill="white" />
      <!-- Lines -->
      <line x1="-15" y1="-14" x2="15" y2="-14" stroke="white" stroke-width="4.5" stroke-linecap="round" />
      <line x1="-15" y1="0" x2="15" y2="0" stroke="white" stroke-width="4.5" stroke-linecap="round" />
      <line x1="-15" y1="14" x2="8" y2="14" stroke="white" stroke-width="4.5" stroke-linecap="round" />
    </g>

    <!-- Text Label -->
    <text x="625" y="${HALF_H + 600}" text-anchor="middle" font-family="'Sarabun', 'Noto Sans Thai', 'Thonburi', sans-serif" font-size="78" font-weight="bold" fill="#ffffff" letter-spacing="1">
      ตารางเวรแพทย์
    </text>
    <text x="625" y="${HALF_H + 670}" text-anchor="middle" font-family="'Sarabun', 'Noto Sans Thai', sans-serif" font-size="36" font-weight="500" fill="#a7f3d0" letter-spacing="1">
      Duty Roster &amp; Shifts
    </text>
  </g>

  <!-- ==================== QUADRANT 4: ติดต่อพี่กุ้ง (BOTTOM-RIGHT) ==================== -->
  <g id="btn-emergency">
    <rect x="${HALF_W}" y="${HALF_H}" width="${HALF_W}" height="${HALF_H}" fill="url(#grad-rose)" />
    <!-- Inner Card Effect -->
    <rect x="${HALF_W + 24}" y="${HALF_H + 24}" width="${HALF_W - 48}" height="${HALF_H - 48}" rx="36" fill="white" fill-opacity="0.08" stroke="white" stroke-width="4" stroke-opacity="0.2" filter="url(#card-shadow)" />

    <!-- Icon: Emergency Phone & Alert -->
    <g transform="translate(${HALF_W + 625}, ${HALF_H + 340}) scale(3.2)" filter="url(#icon-glow)">
      <!-- Phone Handset -->
      <path d="M-18 -18 C -22 -14 -24 -8 -20 2 C -16 12 -8 20 2 24 C 12 28 18 26 22 22 L 14 14 L 8 18 C 2 14 -2 10 -6 4 L -2 -2 Z" fill="white" />
      <!-- Sound Waves / Alert Cross -->
      <path d="M12 -8 A 16 16 0 0 1 20 0" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" />
      <path d="M18 -16 A 26 26 0 0 1 30 -4" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" />
    </g>

    <!-- Text Label -->
    <text x="${HALF_W + 625}" y="${HALF_H + 600}" text-anchor="middle" font-family="'Sarabun', 'Noto Sans Thai', 'Thonburi', sans-serif" font-size="78" font-weight="bold" fill="#ffffff" letter-spacing="1">
      ติดต่อพี่กุ้ง (ฉุกเฉิน)
    </text>
    <text x="${HALF_W + 625}" y="${HALF_H + 670}" text-anchor="middle" font-family="'Sarabun', 'Noto Sans Thai', sans-serif" font-size="36" font-weight="500" fill="#fecdd3" letter-spacing="1">
      24/7 Medical Admin Hotline
    </text>
  </g>

  <!-- Center Cross Divider -->
  <line x1="${HALF_W}" y1="0" x2="${HALF_W}" y2="${HEIGHT}" stroke="#ffffff" stroke-width="6" stroke-opacity="0.3" />
  <line x1="0" y1="${HALF_H}" x2="${WIDTH}" y2="${HALF_H}" stroke="#ffffff" stroke-width="6" stroke-opacity="0.3" />

  <!-- Center Brand Medallion -->
  <circle cx="${HALF_W}" cy="${HALF_H}" r="64" fill="#ffffff" filter="url(#card-shadow)" />
  <!-- Red Cross in Circle -->
  <rect x="${HALF_W - 8}" y="${HALF_H - 28}" width="16" height="56" rx="4" fill="#dc2626" />
  <rect x="${HALF_W - 28}" y="${HALF_H - 8}" width="56" height="16" rx="4" fill="#006699" />
</svg>
`;

async function generate() {
  console.log(`🎨 Rendering 100% Full-Bleed Rich Menu image (${WIDTH}x${HEIGHT}px)...`);
  
  const destPath = path.join(rootDir, 'public', 'richmenu.jpg');
  
  await sharp(Buffer.from(svgMarkup))
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toFile(destPath);

  const stats = fs.statSync(destPath);
  console.log(`✅ Saved perfectly aligned edge-to-edge Rich Menu to: ${destPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

generate().catch(console.error);

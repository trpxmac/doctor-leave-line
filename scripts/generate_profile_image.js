import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const SIZE = 1000;

// Official Bangkok Hospital Siriroj Avatar / Profile Picture (BDMS Identity)
const avatarSvg = `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>

    <filter id="logo-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="30" flood-color="#006699" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Circular Base -->
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg-grad)" />

  <!-- Subtle Hospital Blue Ring -->
  <circle cx="500" cy="500" r="470" fill="none" stroke="#006699" stroke-width="12" stroke-opacity="0.15" />
  <circle cx="500" cy="500" r="450" fill="none" stroke="#006699" stroke-width="4" stroke-opacity="0.25" />

  <!-- Center Emblem (BDMS Medical Emblem) -->
  <g transform="translate(500, 390)" filter="url(#logo-shadow)">
    <!-- Shield / Badge Background -->
    <rect x="-160" y="-160" width="320" height="320" rx="64" fill="#ffffff" stroke="#e2e8f0" stroke-width="6" />
    
    <!-- Red Cross Vertical -->
    <rect x="-35" y="-115" width="70" height="230" rx="16" fill="#dc2626" />
    <!-- Blue Cross Horizontal -->
    <rect x="-115" y="-35" width="230" height="70" rx="16" fill="#006699" />
  </g>

  <!-- Typography: BANGKOK HOSPITAL SIRIROJ -->
  <text x="500" y="660" text-anchor="middle" font-family="'Sarabun', 'Arial', sans-serif" font-size="52" font-weight="900" fill="#006699" letter-spacing="4">
    BANGKOK HOSPITAL
  </text>
  <text x="500" y="730" text-anchor="middle" font-family="'Sarabun', 'Arial', sans-serif" font-size="46" font-weight="800" fill="#dc2626" letter-spacing="6">
    SIRIROJ
  </text>
  <text x="500" y="800" text-anchor="middle" font-family="'Sarabun', 'Noto Sans Thai', sans-serif" font-size="34" font-weight="600" fill="#64748b" letter-spacing="2">
    ระบบลาแพทย์ • DOCTOR LEAVE
  </text>
</svg>
`;

async function generate() {
  console.log(`🎨 Rendering Official LINE OA Profile Avatar (${SIZE}x${SIZE}px)...`);
  const destPath = path.join(rootDir, 'public', 'bsi_profile.png');
  
  await sharp(Buffer.from(avatarSvg))
    .png({ quality: 100 })
    .toFile(destPath);

  console.log(`✅ Saved high-res profile avatar to: ${destPath}`);
}

generate().catch(console.error);

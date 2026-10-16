const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const src = 'C:/Users/NEXT Speed/.gemini/antigravity-ide/brain/dc99d4bc-db4d-4b4a-9a17-dd5da33b3ad1/richmenu_flat_graphic_1792119868632.jpg';

const WIDTH = 2500;
const HEIGHT = 1686;
const HALF_W = 1250;
const HALF_H = 843;

async function main() {
  console.log('🎨 Generating pristine, artifact-free Rich Menu with intact "ตารางเวรแพทย์"...');

  const targetSize = 710;

  // Q1: Blue (x=325..620)
  const q1Content = await sharp(src)
    .extract({ left: 325, top: 125, width: 295, height: 295 })
    .resize(targetSize, targetSize, { kernel: 'lanczos3' })
    .toBuffer();

  const q1Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 21, g: 97, b: 195 } } })
    .composite([{ input: q1Content, top: Math.round((HALF_H - targetSize) / 2), left: Math.round((HALF_W - targetSize) / 2) }])
    .png()
    .toBuffer();

  // Q2: Cyan (x=635..925 - completely avoids the center boundary line)
  const q2Content = await sharp(src)
    .extract({ left: 635, top: 125, width: 290, height: 295 })
    .resize(targetSize, targetSize, { kernel: 'lanczos3' })
    .toBuffer();

  const q2Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 24, g: 168, b: 218 } } })
    .composite([{ input: q2Content, top: Math.round((HALF_H - targetSize) / 2), left: Math.round((HALF_W - targetSize) / 2) }])
    .png()
    .toBuffer();

  // Q3: Green - width 298 ensures 'ย์' in ตารางเวรแพทย์ is 100% complete and intact!
  const q3Content = await sharp(src)
    .extract({ left: 325, top: 428, width: 298, height: 295 })
    .resize(targetSize, targetSize, { kernel: 'lanczos3' })
    .toBuffer();

  const q3Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 7, g: 174, b: 122 } } })
    .composite([{ input: q3Content, top: Math.round((HALF_H - targetSize) / 2), left: Math.round((HALF_W - targetSize) / 2) }])
    .png()
    .toBuffer();

  // Q4: Red (x=635..925) with intact phone icon + clean updated text "ติดต่อฝ่ายการแพทย์ (ฉุกเฉิน)"
  const q4Content = await sharp(src)
    .extract({ left: 635, top: 428, width: 290, height: 295 })
    .resize(targetSize, targetSize, { kernel: 'lanczos3' })
    .toBuffer();

  const promptBase64 = fs.readFileSync(path.join(__dirname, 'Prompt-Bold.woff')).toString('base64');
  const textPatchSvg = `
  <svg width="${HALF_W}" height="380" xmlns="http://www.w3.org/2000/svg">
    <style>
      @font-face {
        font-family: 'PromptBold';
        src: url(data:font/woff;charset=utf-8;base64,${promptBase64}) format('woff');
      }
      .q4-title {
        font-family: 'PromptBold', 'Kanit', sans-serif;
        font-size: 96px;
        font-weight: 700;
        fill: #ffffff;
        letter-spacing: -0.5px;
      }
      .q4-sub {
        font-family: 'PromptBold', 'Kanit', sans-serif;
        font-size: 86px;
        font-weight: 700;
        fill: #ffffff;
        letter-spacing: 0.5px;
      }
    </style>
    <rect width="${HALF_W}" height="380" fill="#f45b53" />
    <text x="${HALF_W / 2}" y="130" text-anchor="middle" class="q4-title">ติดต่อฝ่ายการแพทย์</text>
    <text x="${HALF_W / 2}" y="260" text-anchor="middle" class="q4-sub">(ฉุกเฉิน)</text>
  </svg>
  `;
  const textPatchBuffer = await sharp(Buffer.from(textPatchSvg)).png().toBuffer();

  const q4Bg = await sharp({ create: { width: HALF_W, height: HALF_H, channels: 3, background: { r: 244, g: 91, b: 83 } } })
    .composite([
      { input: q4Content, top: Math.round((HALF_H - targetSize) / 2), left: Math.round((HALF_W - targetSize) / 2) },
      { input: textPatchBuffer, left: 0, top: 460 }
    ])
    .png()
    .toBuffer();

  const dividerSvg = `<svg width="2500" height="1686" xmlns="http://www.w3.org/2000/svg">
    <line x1="1250" y1="0" x2="1250" y2="1686" stroke="white" stroke-width="3" stroke-opacity="0.35" />
    <line x1="0" y1="843" x2="2500" y2="843" stroke="white" stroke-width="3" stroke-opacity="0.35" />
  </svg>`;

  const outputPath = path.join(rootDir, 'public', 'richmenu.jpg');
  await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([
      { input: q1Bg, left: 0, top: 0 },
      { input: q2Bg, left: HALF_W, top: 0 },
      { input: q3Bg, left: 0, top: HALF_H },
      { input: q4Bg, left: HALF_W, top: HALF_H },
      { input: Buffer.from(dividerSvg), left: 0, top: 0 }
    ])
    .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
    .toFile(outputPath);

  fs.copyFileSync(outputPath, path.join(rootDir, 'dist', 'richmenu.jpg'));
  console.log(`✅ Saved flawless master Rich Menu to: ${outputPath}`);
}

main().catch(console.error);

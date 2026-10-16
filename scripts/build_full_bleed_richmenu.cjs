const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function buildOldAestheticMenu() {
  const rootDir = path.join(__dirname, '..');
  const baseImgPath = path.join(rootDir, 'public', 'old_style_24e.jpg');
  const destPath = path.join(rootDir, 'public', 'richmenu.jpg');

  const promptBase64 = fs.readFileSync(path.join(__dirname, 'Prompt-Bold.woff')).toString('base64');

  // Exact color of Q4 from old_style_24e.jpg: rgb(244, 91, 83) / #f45b53
  // Q4 bounds: x from 1250 to 2500, y from 843 to 1686
  // Text patch height: from y=1270 to 1686 -> height = 416px
  const textPatchSvg = `
  <svg width="1250" height="416" xmlns="http://www.w3.org/2000/svg">
    <style>
      @font-face {
        font-family: 'PromptBold';
        src: url(data:font/woff;charset=utf-8;base64,${promptBase64}) format('woff');
      }
      .q4-title {
        font-family: 'PromptBold', 'Kanit', sans-serif;
        font-size: 98px;
        font-weight: 700;
        fill: #ffffff;
        stroke: #ffffff;
        stroke-width: 1.5px;
        letter-spacing: -0.5px;
      }
      .q4-sub {
        font-family: 'PromptBold', 'Kanit', sans-serif;
        font-size: 86px;
        font-weight: 700;
        fill: #ffffff;
        stroke: #ffffff;
        stroke-width: 1.5px;
        letter-spacing: 0.5px;
      }
    </style>
    <!-- Solid coral red patch matching exact Q4 color #f45b53 -->
    <rect width="1250" height="416" fill="#f45b53" />
    <text x="625" y="140" text-anchor="middle" class="q4-title">ติดต่อฝ่ายการแพทย์</text>
    <text x="625" y="270" text-anchor="middle" class="q4-sub">(ฉุกเฉิน)</text>
  </svg>
  `;

  const textPatchBuffer = await sharp(Buffer.from(textPatchSvg)).png().toBuffer();

  // Composite text patch onto base image at x=1250, y=1270
  await sharp(baseImgPath)
    .composite([
      { input: textPatchBuffer, left: 1250, top: 1270 }
    ])
    .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
    .toFile(destPath);

  console.log(`✅ Saved refined old-aesthetic Rich Menu to: ${destPath}`);
}

buildOldAestheticMenu().catch(console.error);

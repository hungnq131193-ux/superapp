// Sinh bộ icon PWA (192/512/maskable) từ một glyph SVG bằng Chromium có sẵn.
// Chạy lại khi muốn đổi icon: node scripts/make-icons.mjs
import {chromium} from 'file:///opt/node22/lib/node_modules/playwright/index.mjs';
import {mkdirSync, writeFileSync} from 'node:fs';

const svg = (pad) => `<!doctype html><meta charset="utf-8"><body style="margin:0">
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad > 0 ? 0 : 96}" fill="#0f766e"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    <path d="M256 88 L448 236 H400 V424 H288 V320 H224 V424 H112 V236 H64 Z" fill="#ffffff"/>
    <rect x="236" y="140" width="40" height="56" fill="#0f766e"/>
    <rect x="152" y="272" width="48" height="48" fill="#0f766e" opacity=".35"/>
    <rect x="312" y="272" width="48" height="48" fill="#0f766e" opacity=".35"/>
  </g>
</svg>`;

mkdirSync('public/icons', {recursive: true});
const browser = await chromium.launch({executablePath: '/opt/pw-browsers/chromium'});
const page = await browser.newPage({viewport: {width: 512, height: 512}});

async function shot(html, size, out) {
  await page.setContent(html);
  const el = page.locator('svg');
  const buf = await el.screenshot({omitBackground: false});
  if (size !== 512) {
    await page.setContent(`<body style="margin:0"><img src="data:image/png;base64,${buf.toString('base64')}" width="${size}" height="${size}" style="display:block">`);
    const buf2 = await page.locator('img').screenshot();
    writeFileSync(out, buf2);
  } else {
    writeFileSync(out, buf);
  }
  console.log('written', out);
}

await shot(svg(0), 512, 'public/icons/icon-512.png');
await shot(svg(0), 192, 'public/icons/icon-192.png');
// Maskable: glyph thu nhỏ vào safe-zone 80%.
await shot(svg(64), 512, 'public/icons/maskable-512.png');
await browser.close();

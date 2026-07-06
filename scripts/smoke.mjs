// Smoke test production build trên desktop + mobile viewport bằng Playwright.
// Yêu cầu: đã chạy `npm run build`. Chạy: npm run smoke
// Dùng Chromium do Playwright quản lý (PLAYWRIGHT_BROWSERS_PATH) hoặc CHROMIUM_PATH.
import {createServer} from 'node:http';
import {readFileSync, existsSync} from 'node:fs';
import {join, extname, resolve} from 'node:path';

async function loadChromium() {
  try {
    return (await import('playwright')).chromium;
  } catch {
    return (await import('file:///opt/node22/lib/node_modules/playwright/index.mjs')).chromium;
  }
}

const DIST = resolve('dist');
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('Chưa có bản build. Chạy `npm run build` trước.');
  process.exit(1);
}
const MIME = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json'};
const server = createServer((req, res) => {
  let p = join(DIST, req.url.split('?')[0]);
  if (!existsSync(p) || extname(p) === '') p = join(DIST, 'index.html');
  res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(4300, r));

const chromium = await loadChromium();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)
});

const PRESET_BUTTONS = [/Nhà ống 5m x 18m/, /Nhà ống 4.5m x 20m/, /Nhà 1 tầng 90m/, /Nhà phố 6m x 15m/, /89–90m²/];
let failed = false;

for (const [label, viewport] of [['desktop 1280x800', {width: 1280, height: 800}], ['mobile 390x844', {width: 390, height: 844}]]) {
  const context = await browser.newContext({viewport, hasTouch: label.startsWith('mobile')});
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:4300/');
  await page.waitForSelector('h1');

  // Toast PWA "sẵn sàng offline" có thể che UI — đóng nếu xuất hiện.
  async function dismissToast() {
    const close = page.locator('.updateToast button', {hasText: 'Đóng'});
    if (await close.count()) await close.click().catch(() => {});
  }

  for (const preset of PRESET_BUTTONS) {
    await dismissToast();
    // Preset nằm ở bước 1 của wizard.
    await page.locator('.stepDots button').first().click();
    await page.getByRole('button', {name: preset}).first().click();
    await page.getByRole('button', {name: 'Tiếp tục →'}).click();
    await page.getByRole('button', {name: 'Tiếp tục →'}).click();
    await page.getByRole('button', {name: 'Sinh 10+ phương án'}).click();
    // Đợi vòng sinh phương án hiện tại kết thúc (cards cũ vẫn nằm trong DOM).
    await page.waitForSelector('.loading', {state: 'visible', timeout: 2000}).catch(() => {});
    await page.waitForSelector('.loading', {state: 'hidden', timeout: 15000});
    await page.waitForSelector('.cards .card', {timeout: 10000});
    await dismissToast();
    const cards = await page.locator('.cards .card').count();
    const floors = await page.locator('.floorTabs button').count();
    console.log(`[${label}] preset ${preset}: ${cards} phương án, ${floors} tab tầng`);
    if (cards < 10) {
      console.error(`[${label}] FAIL: chỉ có ${cards} phương án (<10)`);
      failed = true;
    }
    // đổi tầng + chạm chọn 1 phòng
    if (floors > 1) await page.locator('.floorTabs button').nth(1).click();
    await page.locator('#plan-canvas').scrollIntoViewIfNeeded();
    const rect = await page.locator('#plan-canvas svg g g rect').nth(1).boundingBox();
    if (rect) await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.waitForTimeout(120);
    // quay lại đầu trang cho preset tiếp theo
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  if (errors.length) {
    console.error(`[${label}] FAIL: console errors:`, errors);
    failed = true;
  } else {
    console.log(`[${label}] OK: không có console error`);
  }
  await context.close();
}

await browser.close();
server.close();
if (failed) {
  console.error('SMOKE FAILED');
  process.exit(1);
}
console.log('SMOKE PASSED');

// Renders ARIS-1 to public/aris/poster-{400,800}.webp: the transparent still that shows before the
// 3D robot loads, under reduced motion, and on devices without WebGL. Run it after changing the
// robot (npm run poster). Needs Playwright's Chromium: npx playwright install chromium
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(import.meta.dirname, '..');
const port = 4455;

const dev = spawn('npx', ['astro', 'dev', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('astro dev did not start')), 60000);
    dev.stdout.on('data', (d) => { if (String(d).includes(`localhost:${port}`)) { clearTimeout(timer); resolve(); } });
  });
  // Software GL keeps the render identical on every machine; --no-sandbox lets it run as root in CI.
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__aris?.snapshot, null, { timeout: 120000 });
  const dataUrl = await page.evaluate(() => window.__aris.snapshot(1600, 1920));
  await browser.close();
  await writePoster(Buffer.from(dataUrl.split(',')[1], 'base64'));
} finally {
  dev.kill();
}

/** Rendered at 1600×1920 and scaled down: supersampling gives clean edges at both sizes. */
async function writePoster(png) {
  const out = join(root, 'public', 'aris');
  mkdirSync(out, { recursive: true });
  for (const w of [400, 800]) {
    await sharp(png).resize(w, w * 1.2).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(join(out, `poster-${w}.webp`));
  }
  console.log('poster: wrote public/aris/poster-400.webp and poster-800.webp');
}

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const W = 1200, H = 630;
const sub = 'Node.js · Python · Kafka · MongoDB · Redis';
const root = join(import.meta.dirname, '..');

// Deterministic stars, so the image only changes when the design does.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const stars = Array.from({ length: 140 }, () => `<circle cx="${(rand() * W).toFixed(1)}" cy="${(rand() * H).toFixed(1)}" r="${(0.4 + rand() * 1.3).toFixed(2)}" fill="#dfeaff" fill-opacity="${(0.3 + rand() * 0.6).toFixed(2)}"/>`).join('');

const font = 'DejaVu Sans, system-ui, sans-serif';
const mono = 'DejaVu Sans Mono, ui-monospace, monospace';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="a" cx="85%" cy="0%" r="70%"><stop offset="0" stop-color="#1de9c9" stop-opacity=".28"/><stop offset="1" stop-color="#1de9c9" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="0%" cy="100%" r="65%"><stop offset="0" stop-color="#7c5cff" stop-opacity=".3"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#060a17"/>
  <rect width="${W}" height="${H}" fill="url(#a)"/>
  <rect width="${W}" height="${H}" fill="url(#b)"/>
  ${stars}
  <rect x="0" y="0" width="${W}" height="4" fill="#3ff3dc"/>
  <text x="80" y="150" font-family="${mono}" font-size="20" letter-spacing="4" fill="#3ff3dc">SYSTEM ONLINE · JAKARTA, INDONESIA</text>
  <text x="80" y="236" font-family="${font}" font-size="66" font-weight="700" fill="#eaf2ff">Nevalen Aginda</text>
  <text x="80" y="312" font-family="${font}" font-size="66" font-weight="700" fill="#6cc9ff">Prasetyo</text>
  <text x="80" y="372" font-family="${font}" font-size="26" font-weight="600" fill="#b9c6dd">Tech Lead — Payment Infrastructure</text>
  <text x="80" y="406" font-family="${font}" font-size="26" font-weight="600" fill="#b9c6dd">&amp; Merchant Acquiring</text>
  <text x="80" y="456" font-family="${mono}" font-size="20" fill="#8e9cb8">${sub}</text>
  <rect x="80" y="492" width="580" height="58" rx="12" fill="#0b1326" stroke="#33507f" stroke-width="1.5"/>
  <text x="104" y="528" font-family="${mono}" font-size="18" fill="#eaf2ff">~500k users · ~2,000 QRIS merchants · p99 &lt; 500 ms</text>
</svg>`;

const out = join(root, 'public', 'og.png');
mkdirSync(join(root, 'public'), { recursive: true });
// ARIS-1 is the rendered poster from scripts/render-poster.mjs, placed on the right.
const poster = join(root, 'public', 'aris', 'poster-800.webp');
const layers = existsSync(poster)
  ? [{ input: await sharp(poster).resize(440, 528).png().toBuffer(), left: 720, top: 70 }]
  : [];
await sharp(Buffer.from(svg))
  .resize({ width: W, height: H })
  .composite(layers)
  .png()
  .toFile(out);
console.log('og: wrote public/og.png');

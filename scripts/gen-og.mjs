import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const W = 1200, H = 630;
const sub = 'Node.js · Python · Kafka · MongoDB · Redis';
const root = join(import.meta.dirname, '..');

const font = 'DejaVu Sans, system-ui, sans-serif';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f5fbf8"/>
  <circle cx="90" cy="40" r="190" fill="#ddf6ea"/>
  <circle cx="980" cy="330" r="250" fill="#fff6c7"/>
  <circle cx="620" cy="650" r="130" fill="#e1f1ff"/>
  <rect x="0" y="0" width="300" height="10" fill="#3ddc97"/><rect x="300" y="0" width="300" height="10" fill="#ffe45e"/>
  <rect x="600" y="0" width="300" height="10" fill="#5bc0ff"/><rect x="900" y="0" width="300" height="10" fill="#ff8a7a"/>
  <text x="80" y="196" font-family="${font}" font-size="64" font-weight="700" fill="#13293d">Nevalen Aginda</text>
  <text x="80" y="270" font-family="${font}" font-size="64" font-weight="700" fill="#13293d">Prasetyo</text>
  <text x="80" y="330" font-family="${font}" font-size="26" font-weight="600" fill="#06704e">Tech Lead — Payment Infrastructure</text>
  <text x="80" y="364" font-family="${font}" font-size="26" font-weight="600" fill="#06704e">&amp; Merchant Acquiring</text>
  <text x="80" y="414" font-family="${font}" font-size="22" fill="#556b7e">${sub}</text>
  <rect x="80" y="450" width="560" height="60" rx="30" fill="#ffffff" stroke="#d9eee3" stroke-width="2"/>
  <text x="106" y="488" font-family="${font}" font-size="20" fill="#13293d">~500k users · ~2,000 QRIS merchants · p99 &lt; 500 ms</text>
</svg>`;

const out = join(root, 'public', 'og.png');
mkdirSync(join(root, 'public'), { recursive: true });
// Byte is the rendered poster from scripts/render-poster.mjs, placed on the right.
const poster = join(root, 'public', 'byte', 'poster-960.webp');
const layers = existsSync(poster)
  ? [{ input: await sharp(poster).resize(520, 520).png().toBuffer(), left: 680, top: 80 }]
  : [];
await sharp(Buffer.from(svg))
  .resize({ width: W, height: H })
  .composite(layers)
  .png()
  .toFile(out);
console.log('og: wrote public/og.png');

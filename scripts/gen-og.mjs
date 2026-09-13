import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const W = 1200, H = 630;
const name = 'Nevalen Aginda Prasetyo';
const role = 'Tech Lead — Payment Infrastructure &amp; Merchant Acquiring';
const sub = 'Node.js · Python · Kafka · MongoDB · Redis';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2563eb"/>
      <stop offset="0.5" stop-color="#06b6d4"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
    <radialGradient id="wash" cx="0.12" cy="-0.1" r="0.9">
      <stop offset="0" stop-color="#2563eb" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#2563eb" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#f8fafc"/>
  <rect width="${W}" height="${H}" fill="url(#wash)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="url(#brand)"/>
  <text x="80" y="268" font-family="DejaVu Sans, system-ui, sans-serif" font-size="70" font-weight="600" fill="#0f172a">${name}</text>
  <text x="80" y="340" font-family="DejaVu Sans, system-ui, sans-serif" font-size="30" fill="#2563eb">${role}</text>
  <rect x="80" y="378" width="120" height="4" rx="2" fill="url(#brand)"/>
  <text x="80" y="428" font-family="DejaVu Sans, system-ui, sans-serif" font-size="24" fill="#64748b">${sub}</text>
  <text x="80" y="536" font-family="DejaVu Sans, system-ui, sans-serif" font-size="22" fill="#334155">~500k active users · ~2,000 QRIS merchants · p99 &lt; 500 ms</text>
</svg>`;

const out = join(import.meta.dirname, '..', 'public', 'og.png');
mkdirSync(join(import.meta.dirname, '..', 'public'), { recursive: true });
await sharp(Buffer.from(svg))
  .resize({ width: W, height: H })
  .png()
  .toFile(out);
console.log('og: wrote public/og.png');

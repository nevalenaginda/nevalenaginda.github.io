import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const W = 1200, H = 630;
const name = 'Nevalen Aginda Prasetyo';
const role = 'Tech Lead &amp; Backend Engineer';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#faf8f3"/>
  <text x="80" y="272" font-family="DejaVu Sans, system-ui, sans-serif" font-size="72" font-weight="600" fill="#17170f">${name}</text>
  <text x="80" y="352" font-family="DejaVu Sans, system-ui, sans-serif" font-size="32" fill="#0f7a63">${role}</text>
  <rect x="80" y="392" width="60" height="3" rx="1.5" fill="#ddd6c7"/>
</svg>`;

const out = join(import.meta.dirname, '..', 'public', 'og.png');
mkdirSync(join(import.meta.dirname, '..', 'public'), { recursive: true });
await sharp(Buffer.from(svg))
  .resize({ width: W, height: H })
  .png()
  .toFile(out);
console.log('og: wrote public/og.png');
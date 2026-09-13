import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const W = 1200, H = 630;
const name = 'Nevalen Aginda Prasetyo';
const role = 'Software Engineer Technical Lead';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#10110f"/>
  <text x="80" y="272" font-family="DejaVu Sans, system-ui, sans-serif" font-size="72" font-weight="600" fill="#e8e6e1">${name}</text>
  <text x="80" y="352" font-family="DejaVu Sans, system-ui, sans-serif" font-size="32" fill="#b8c694">${role}</text>
  <rect x="80" y="392" width="60" height="3" rx="1.5" fill="#343832"/>
</svg>`;

const out = join(import.meta.dirname, '..', 'public', 'og.png');
mkdirSync(join(import.meta.dirname, '..', 'public'), { recursive: true });
await sharp(Buffer.from(svg))
  .resize({ width: W, height: H })
  .png()
  .toFile(out);
console.log('og: wrote public/og.png');
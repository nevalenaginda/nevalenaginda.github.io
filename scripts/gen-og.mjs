import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const W = 1200, H = 630;
const name = 'Nevalen Aginda Prasetyo';
const role = 'Tech Lead — Payment Infrastructure &amp; Merchant Acquiring';
const sub = 'Node.js · Python · Kafka · MongoDB · Redis';

const font = 'DejaVu Sans, system-ui, sans-serif';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fff8f0"/>
  <circle cx="90" cy="40" r="180" fill="#f3edff"/>
  <circle cx="1120" cy="560" r="200" fill="#ffeaf3"/>
  <circle cx="620" cy="640" r="120" fill="#e3faf1"/>
  <rect x="0" y="0" width="300" height="10" fill="#8b5cf6"/><rect x="300" y="0" width="300" height="10" fill="#ff6fae"/>
  <rect x="600" y="0" width="300" height="10" fill="#ffc83d"/><rect x="900" y="0" width="300" height="10" fill="#34d3a0"/>
  <text x="80" y="236" font-family="${font}" font-size="64" font-weight="700" fill="#1f1a3d">${name}</text>
  <text x="80" y="300" font-family="${font}" font-size="28" font-weight="600" fill="#6d28d9">${role}</text>
  <text x="80" y="356" font-family="${font}" font-size="24" fill="#5f5885">${sub}</text>
  <rect x="80" y="420" width="560" height="64" rx="32" fill="#fff4d6"/>
  <text x="108" y="461" font-family="${font}" font-size="22" fill="#1f1a3d">~500k users · ~2,000 QRIS merchants · p99 &lt; 500 ms</text>
  <g transform="translate(880 150) scale(.95)">
    <path d="M160 58V28" stroke="#3d3760" stroke-width="7" stroke-linecap="round"/>
    <circle cx="160" cy="24" r="13" fill="#ff6fae"/>
    <rect x="62" y="56" width="196" height="150" rx="58" fill="#8b5cf6"/>
    <rect x="86" y="80" width="148" height="102" rx="40" fill="#1f1a3d"/>
    <rect x="118" y="108" width="20" height="38" rx="10" fill="#5ef2d6"/>
    <rect x="182" y="108" width="20" height="38" rx="10" fill="#5ef2d6"/>
    <ellipse cx="104" cy="158" rx="12" ry="7" fill="#ff6fae"/>
    <ellipse cx="216" cy="158" rx="12" ry="7" fill="#ff6fae"/>
    <path d="M146 162q14 12 28 0" stroke="#5ef2d6" stroke-width="6" stroke-linecap="round" fill="none"/>
    <rect x="48" y="112" width="18" height="40" rx="9" fill="#ffc83d"/>
    <rect x="254" y="112" width="18" height="40" rx="9" fill="#ffc83d"/>
    <rect x="104" y="214" width="112" height="92" rx="44" fill="#a78bfa"/>
    <circle cx="160" cy="254" r="17" fill="#ffc83d"/>
    <rect x="70" y="226" width="30" height="62" rx="15" fill="#a78bfa" transform="rotate(18 85 230)"/>
    <circle cx="76" cy="292" r="15" fill="#ffc83d"/>
    <rect x="222" y="170" width="30" height="64" rx="15" fill="#a78bfa" transform="rotate(-38 237 230)"/>
    <circle cx="272" cy="186" r="15" fill="#ffc83d"/>
  </g>
</svg>`;

const out = join(import.meta.dirname, '..', 'public', 'og.png');
mkdirSync(join(import.meta.dirname, '..', 'public'), { recursive: true });
await sharp(Buffer.from(svg))
  .resize({ width: W, height: H })
  .png()
  .toFile(out);
console.log('og: wrote public/og.png');

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const source = join(root, 'src');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
const fail = (message) => { console.error(`verify: ${message}`); process.exitCode = 1; };

for (const file of walk(source)) {
  const body = readFileSync(file, 'utf8');
  if (/bootstrap|jquery/i.test(body)) fail(`legacy dependency found in ${file}`);
  if (/\bdark:/.test(body)) fail(`dark-mode class left in ${file} (the site has one theme, deep space)`);
  // Three.js must stay behind the dynamic import in the ARIS-1 controller so it never blocks first paint.
  if (/from ['"]three['"]/.test(body) && !file.includes(join('scripts', 'aris', 'webgl'))) fail(`static three import outside src/scripts/aris/webgl in ${file}`);
}
if (!existsSync(dist)) fail('dist missing; run build first');
for (const file of walk(dist).filter((path) => path.endsWith('.html'))) {
  const body = readFileSync(file, 'utf8');
  for (const href of body.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const target = href[1];
    if (!target.startsWith('/') || target.startsWith('//') || target.includes('#')) continue;
    const pathname = target.split(/[?#]/)[0];
    const candidate = join(dist, pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (!existsSync(candidate) && !existsSync(join(dist, pathname))) fail(`broken internal link ${target} in ${file}`);
  }
}
for (const file of walk(dist).filter((path) => path.endsWith('.html'))) {
  const body = readFileSync(file, 'utf8');
  for (const src of body.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    const js = readFileSync(join(dist, src[1]), 'utf8');
    if (/WebGLRenderer/.test(js)) fail(`Three.js is loaded eagerly by ${file}`);
  }
}
// In-page anchors (the reading guide, skip links) must point at an id on the same page.
for (const file of walk(dist).filter((path) => path.endsWith('.html'))) {
  const body = readFileSync(file, 'utf8');
  const ids = new Set([...body.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1]));
  for (const m of body.matchAll(/href=["']#([^"']+)["']/g)) {
    if (!ids.has(m[1])) fail(`anchor #${m[1]} has no target in ${file}`);
  }
}
if (!process.exitCode) console.log('verify: source clean; internal links and anchors resolve; Three.js stays lazy');
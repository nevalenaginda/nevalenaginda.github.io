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
if (!process.exitCode) console.log('verify: source clean; internal links resolve');
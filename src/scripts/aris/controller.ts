// The home page's ARIS-1 controller. It owns everything that works without WebGL (HUD telemetry,
// narration, voice and sound, scan targets, inspection controls, the flight-mode switch) and loads
// the 3D layer lazily. Without WebGL, reduced motion or save-data, the poster stays and scans
// still sweep and narrate; only solar flight needs the 3D layer.
import { parts, waypoints, type Part, type Waypoint } from '../../data/site';
import { sfx, voice } from './audio';
import type { Aris, Telemetry } from './types';

const root = document.documentElement;
const slot = document.querySelector<HTMLElement>('[data-aris-slot]');
const solarUi = document.querySelector<HTMLElement>('[data-solar-ui]');
const telemetry: Telemetry = { sys: 'STANDBY', x: 0, y: 0, thrust: 0, fps: 0, distance: 0 };
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const emit = (name: string, detail?: unknown) => document.dispatchEvent(new CustomEvent(name, { detail }));

let aris: Aris | null = null;
let loading: Promise<Aris | null> | null = null;
let mode: 'inspect' | 'solar' = 'inspect';
let switching = false;

// ---- can the 3D layer run here?
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
const can3d = !!slot && !reduce && !saveData && 'WebGL2RenderingContext' in window;

function markStatic(reason: string) {
  telemetry.sys = 'STATIC';
  document.querySelectorAll<HTMLButtonElement>('[data-mode="solar"]').forEach((b) => { b.disabled = true; b.title = reason; });
  document.querySelectorAll<HTMLElement>('[data-static-note]').forEach((n) => { n.hidden = false; n.textContent = reason; });
  document.querySelectorAll<HTMLElement>('[data-needs-3d]').forEach((n) => { n.hidden = true; });
}

function load() {
  if (!can3d) return Promise.resolve(null);
  loading ??= import('./webgl').then(({ mountAris }) => {
    aris = mountAris(slot!, telemetry, { onPoke, onArrive, onDepart });
    if (!aris) markStatic('3D needs a hardware-accelerated GPU, so ARIS-1 is shown as a still.');
    return aris;
  }).catch(() => { markStatic('ARIS-1 could not start its 3D systems.'); return null; });
  return loading;
}

if (!can3d) {
  markStatic(reduce ? 'Reduced motion is on, so ARIS-1 holds still and solar flight is off.' : saveData ? 'Data saver is on, so ARIS-1 stays a still image.' : 'This browser has no WebGL 2, so ARIS-1 stays a still image.');
} else if (fine) {
  // Desktop: load once the page is idle, so Three.js never competes with first paint.
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300));
  if (document.readyState === 'complete') idle(() => load());
  else addEventListener('load', () => idle(() => load()), { once: true });
} else {
  // Phones and tablets: the poster carries the first view; the 3D robot loads on the first touch
  // or scroll, so slow CPUs never pay for it up front.
  for (const type of ['pointerdown', 'touchstart', 'scroll', 'keydown']) addEventListener(type, () => load(), { once: true, passive: true });
}

// ---- narration: one line for screen readers, the callout, and the voice
const readouts = document.querySelectorAll<HTMLElement>('[data-aris-readout]');
export function narrate(text: string, { speak = true, callout = text, ms = 3600 }: { speak?: boolean; callout?: string | false; ms?: number } = {}) {
  readouts.forEach((r) => { r.textContent = text; });
  if (callout) aris?.say(callout, ms);
  if (speak) voice.speak(text);
}

// ---- telemetry HUD, a few times a second
const scan = { state: 'STANDBY', target: '—', started: 0, ms: 0 };
const started = performance.now();
const fields = new Map<string, HTMLElement[]>();
document.querySelectorAll<HTMLElement>('[data-tm]').forEach((el) => {
  const key = el.dataset.tm!;
  fields.set(key, [...(fields.get(key) ?? []), el]);
});
const set = (key: string, value: string) => fields.get(key)?.forEach((el) => { if (el.textContent !== value) el.textContent = value; });
const bars = document.querySelectorAll<HTMLElement>('[data-tm-bar]');
const signed = (n: number, digits = 4) => `${n < 0 ? '−' : '+'}${String(Math.abs(Math.round(n))).padStart(digits, '0')}`;

function render() {
  const now = performance.now();
  const met = Math.floor((now - started) / 1000);
  set('sys', telemetry.sys);
  set('mode', mode === 'solar' ? 'SOLAR FLIGHT' : 'INSPECT');
  if (telemetry.sys === 'STATIC') { set('x', '—'); set('y', '—'); }
  else if (mode === 'solar') { set('x', telemetry.x.toFixed(2)); set('y', telemetry.y.toFixed(2)); }
  else { set('x', signed(telemetry.x)); set('y', signed(telemetry.y)); }
  const thrust = Math.round(telemetry.thrust * 100);
  set('thrust', telemetry.sys === 'STATIC' ? 'OFFLINE' : thrust > 55 ? `BURN ${thrust}%` : thrust > 8 ? `CRUISE ${thrust}%` : 'IDLE');
  bars.forEach((b) => { b.style.transform = `scaleX(${b.dataset.tmBar === 'thrust' ? telemetry.thrust : scanProgress(now)})`; });
  set('scan', scan.state === 'SCANNING' ? `SCANNING ${Math.round(scanProgress(now) * 100)}%` : scan.state);
  set('target', scan.target);
  set('fps', telemetry.fps ? String(Math.round(telemetry.fps)) : '—');
  set('met', `${String(Math.floor(met / 60)).padStart(2, '0')}:${String(met % 60).padStart(2, '0')}`);
  set('distance', `${(telemetry.distance / 7).toFixed(2)} AU`);
  set('voice', voice.on ? 'ON' : 'OFF');
  set('sfx', sfx.on ? 'ON' : 'OFF');
}
const scanProgress = (now: number) => (scan.state === 'SCANNING' ? Math.min(1, (now - scan.started) / scan.ms) : scan.state === 'LOCKED' ? 1 : 0);
setInterval(render, 125);
render();

// ---- scan targets: hover (with a little intent), focus, or an explicit scan
let hoverTimer = 0, releaseTimer = 0, lockTimer = 0;
let current: HTMLElement | null = null;
let busyUntil = 0; // an explicit scan keeps ARIS-1 on its card until it is done
let sequence = 0;  // bumps to cancel a running "scan all"

const label = (el: HTMLElement) => el.dataset.scanLabel ?? 'Target';

function attend(el: HTMLElement) {
  clearTimeout(releaseTimer);
  if (performance.now() < busyUntil && current !== el) return;
  current = el;
  aris?.attend(el);
}
function release(delay = 900) {
  clearTimeout(releaseTimer);
  releaseTimer = window.setTimeout(() => {
    if (performance.now() < busyUntil) return release(busyUntil - performance.now() + 200);
    current = null;
    aris?.attend(null);
  }, delay);
}

/** A full scan: fly over, sweep, read the card aloud. */
export function scanCard(el: HTMLElement, { ms = 2600 } = {}) {
  clearTimeout(lockTimer);
  current = el;
  busyUntil = performance.now() + ms;
  document.querySelectorAll('[data-scanning]').forEach((c) => c !== el && c.removeAttribute('data-scanning'));
  el.setAttribute('data-scanning', '');
  if (aris) aris.scan(el, ms);
  else {
    // Without the robot the card sweeps itself.
    el.querySelector('.scan-sweep')?.remove();
    const sweep = document.createElement('span');
    sweep.className = 'scan-sweep';
    sweep.setAttribute('aria-hidden', 'true');
    el.append(sweep);
    setTimeout(() => sweep.remove(), 2600);
  }
  Object.assign(scan, { state: 'SCANNING', target: label(el), started: performance.now(), ms });
  sfx.play('scan');
  narrate(el.dataset.scanSay ?? label(el), { callout: `Scanning · ${label(el)}` });
  lockTimer = window.setTimeout(() => {
    el.removeAttribute('data-scanning');
    scan.state = 'LOCKED';
    lockTimer = window.setTimeout(() => { scan.state = 'STANDBY'; scan.target = '—'; }, 2400);
    if (!el.matches(':hover, :focus-within')) release(1200);
  }, ms);
}

/** A glance on hover: fly over and sweep briefly, no voice. */
function glance(el: HTMLElement) {
  if (performance.now() < busyUntil) return;
  attend(el);
  aris?.scan(el, 2400);
  Object.assign(scan, { state: 'SCANNING', target: label(el), started: performance.now(), ms: 2400 });
  clearTimeout(lockTimer);
  lockTimer = window.setTimeout(() => { scan.state = 'LOCKED'; lockTimer = window.setTimeout(() => { scan.state = 'STANDBY'; scan.target = '—'; }, 1800); }, 2400);
  sfx.play('tick');
}

document.querySelectorAll<HTMLElement>('[data-scan]').forEach((card) => {
  if (fine) {
    card.addEventListener('pointerenter', () => {
      clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => glance(card), 260);
    });
    card.addEventListener('pointerleave', () => { clearTimeout(hoverTimer); release(); });
  }
  card.addEventListener('focusin', () => { if (card.matches(':focus-visible, :has(:focus-visible)')) attend(card); });
  card.addEventListener('focusout', () => release());
  card.querySelectorAll('[data-scan-btn]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sequence++;
    scanCard(card);
  }));
  // Cards without a link of their own scan on a click anywhere.
  if ('scanClick' in card.dataset) card.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a, button')) return;
    sequence++;
    scanCard(card);
  });
});

// ---- quick actions
async function scanAll() {
  const run = ++sequence;
  const cards = [...document.querySelectorAll<HTMLElement>('#specs [data-scan]')];
  narrate(`Scanning all ${cards.length} system modules.`, { callout: 'Scanning all modules' });
  emit('aris:goto', 'specs');
  await wait(1100);
  for (const card of cards) {
    if (run !== sequence) return;
    scanCard(card, { ms: 2400 });
    // With the voice on, wait for each module to be read out.
    await wait(voice.on ? 5600 : 2900);
  }
  if (run === sequence) narrate('Scan complete. Four modules, all nominal.', { callout: 'Scan complete · all nominal' });
}
document.querySelectorAll('[data-action="scan-all"]').forEach((b) => b.addEventListener('click', () => { sfx.play('click'); scanAll(); }));

// ---- inspection controls: each part also names the module it stands for
let inspectTimer = 0;
const inspectButtons = document.querySelectorAll<HTMLButtonElement>('[data-inspect]');
async function inspect(part: Part | null) {
  clearTimeout(inspectTimer);
  inspectButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.inspect === part)));
  if (!part) { aris?.inspect(null); return; }
  sequence++;
  const a = aris ?? (await load());
  a?.inspect(part);
  sfx.play(part === 'thruster' ? 'thrust' : 'inspect');
  narrate(parts[part].say, { callout: `${parts[part].label} → ${parts[part].module}`, ms: 5200 });
  inspectTimer = window.setTimeout(() => inspect(null), 6500);
}
inspectButtons.forEach((b) => b.addEventListener('click', () => {
  const part = b.dataset.inspect as Part;
  inspect(b.getAttribute('aria-pressed') === 'true' ? null : part);
}));

// ---- audio toggles (header and HUD)
const audioButtons = document.querySelectorAll<HTMLButtonElement>('[data-audio-toggle]');
const syncAudio = () => audioButtons.forEach((b) => {
  const on = b.dataset.audioToggle === 'voice' ? voice.on : sfx.on;
  b.setAttribute('aria-pressed', String(on));
  b.querySelectorAll('[data-audio-state]').forEach((s) => { s.textContent = on ? 'On' : 'Off'; });
});
audioButtons.forEach((b) => {
  if (b.dataset.audioToggle === 'voice' && !voice.available) { b.disabled = true; b.title = 'This browser has no speech synthesis.'; }
  b.addEventListener('click', () => {
    if (b.dataset.audioToggle === 'voice') {
      voice.set(!voice.on);
      if (voice.on) narrate('Voice assistant online. Click a module or mission and I will read it to you.', { callout: 'Voice assistant online' });
    } else {
      sfx.set(!sfx.on);
    }
    syncAudio();
    render();
  });
});
syncAudio();

// ---- ARIS-1 events from the 3D layer
function onPoke() {
  sfx.play('thrust');
  narrate("Hello! I'm ARIS-1, Nevalen's exo-architect. Hover any module or mission and I will scan it.", { callout: 'Hello! I am ARIS-1 👋' });
}

// ---- flight modes
const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
const brief = {
  title: solarUi?.querySelector<HTMLElement>('[data-brief-title]'),
  text: solarUi?.querySelector<HTMLElement>('[data-brief-text]'),
  land: solarUi?.querySelector<HTMLAnchorElement>('[data-brief-land]'),
  status: solarUi?.querySelector<HTMLElement>('[data-brief-status]'),
};
const destButtons = document.querySelectorAll<HTMLButtonElement>('[data-waypoint]');
const tourButton = document.querySelector<HTMLButtonElement>('[data-tour]');
let tour = true;
let tourTimer = 0;
let tourDeparting = false;
const byId = Object.fromEntries(waypoints.map((w) => [w.id, w]));
const order = waypoints.map((w) => w.id);

function setTour(on: boolean) {
  tour = on;
  clearTimeout(tourTimer);
  tourButton?.setAttribute('aria-pressed', String(on));
}
function go(id: Waypoint, byTour = false) {
  tourDeparting = byTour;
  if (!byTour) setTour(false);
  sfx.play('click');
  aris?.flyTo(id);
}
function onDepart(id: Waypoint) {
  if (!tourDeparting) setTour(false);
  tourDeparting = false;
  const w = byId[id];
  scan.target = w.name.toUpperCase();
  if (brief.status) brief.status.textContent = `En route · ${w.name}`;
  sfx.play('thrust');
  destButtons.forEach((b) => b.toggleAttribute('aria-current', b.dataset.waypoint === id));
}
function onArrive(id: Waypoint) {
  const w = byId[id];
  scan.target = w.name.toUpperCase();
  if (brief.title) brief.title.textContent = `${w.name} · ${w.title}`;
  if (brief.text) brief.text.textContent = w.brief;
  if (brief.land) { brief.land.href = `#${w.section}`; brief.land.dataset.section = w.section; }
  if (brief.status) brief.status.textContent = `In orbit · ${w.name}`;
  destButtons.forEach((b) => b.toggleAttribute('aria-current', b.dataset.waypoint === id));
  sfx.play('arrive');
  narrate(`${w.name}. ${w.title}. ${w.brief}`, { callout: false });
  if (tour) {
    clearTimeout(tourTimer);
    tourTimer = window.setTimeout(() => {
      if (!tour || mode !== 'solar') return;
      go(order[(order.indexOf(id) + 1) % order.length], true);
    }, voice.on ? 9000 : 6500);
  }
}

const others = () => [document.querySelector('[data-site-header]'), document.querySelector('#main'), document.querySelector('footer')].filter(Boolean) as HTMLElement[];

async function enterSolar() {
  if (mode === 'solar' || switching) return;
  switching = true;
  const a = aris ?? (await load());
  if (!a) { switching = false; sfx.play('error'); narrate('Solar flight needs the 3D systems, which are offline here.', { speak: false }); return; }
  mode = 'solar';
  inspect(null);
  sequence++;
  modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === 'solar')));
  sfx.play('warp');
  emit('aris:warp', 1);
  root.classList.add('solar');
  emit('aris:lock', true);
  await wait(520);
  await a.enterSolar();
  others().forEach((el) => { el.inert = true; });
  if (solarUi) solarUi.hidden = false;
  solarUi?.querySelector<HTMLElement>('[data-solar-focus]')?.focus();
  await wait(380);
  emit('aris:warp', 0);
  switching = false;
  setTour(true);
  narrate('Solar flight mode engaged. Touring the system; pick any destination to take the controls.', { callout: false });
  onArrive(a.destination);
}

async function exitSolar(section?: string) {
  if (mode !== 'solar' || switching || !aris) return;
  switching = true;
  setTour(false);
  sfx.play('warp');
  emit('aris:warp', 1);
  if (solarUi) solarUi.hidden = true;
  others().forEach((el) => { el.inert = false; });
  await wait(320);
  await aris.exitSolar();
  mode = 'inspect';
  modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === 'inspect')));
  root.classList.remove('solar');
  emit('aris:lock', false);
  scan.target = '—';
  await wait(300);
  emit('aris:warp', 0);
  switching = false;
  if (section) emit('aris:goto', section);
  else document.querySelector<HTMLElement>('[data-mode="solar"]')?.focus({ preventScroll: true });
  narrate('Back in inspect mode.', { speak: false, callout: 'Inspect mode' });
}

modeButtons.forEach((b) => b.addEventListener('click', () => (b.dataset.mode === 'solar' ? enterSolar() : exitSolar())));
destButtons.forEach((b) => b.addEventListener('click', () => go(b.dataset.waypoint as Waypoint)));
tourButton?.addEventListener('click', () => {
  setTour(!tour);
  if (tour && aris) go(order[(order.indexOf(aris.destination) + 1) % order.length], true);
});
solarUi?.querySelector('[data-brief-next]')?.addEventListener('click', () => {
  if (aris) go(order[(order.indexOf(aris.destination) + 1) % order.length]);
});
brief.land?.addEventListener('click', (e) => {
  e.preventDefault();
  exitSolar(brief.land?.dataset.section);
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && mode === 'solar') exitSolar(); });

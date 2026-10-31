// The home page's ARIS-1 controller: HUD telemetry, inspection controls, "scan all specs", and the
// flight-mode switch. Scanning, narration, the loading rules and the audio toggles are shared with
// the case studies (targets.ts, narration.ts, boot.ts, audio.ts). Without WebGL, reduced motion or
// save-data, the poster stays and scans still sweep and narrate; only solar flight needs the robot.
import { parts, waypoints, type Part, type Waypoint } from '../../data/site';
import { bindAudioToggles, sfx, voice } from './audio';
import { fine, loadAris, scheduleAris, staticReason, type StaticReason } from './boot';
import { attachNarration, narrate } from './narration';
import { bindReadButtons } from './read-buttons';
import { bindTargets, isCurrent, newSequence, scanCard, scanProgress, scanState } from './targets';
import type { Aris, Telemetry } from './types';

const root = document.documentElement;
const slot = document.querySelector<HTMLElement>('[data-aris-slot]');
const solarUi = document.querySelector<HTMLElement>('[data-solar-ui]');
const telemetry: Telemetry = { sys: 'STANDBY', x: 0, y: 0, thrust: 0, fps: 0, distance: 0 };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const emit = (name: string, detail?: unknown) => document.dispatchEvent(new CustomEvent(name, { detail }));

let aris: Aris | null = null;
let mode: 'inspect' | 'solar' = 'inspect';
let switching = false;

// ---- loading the 3D layer (boot.ts decides whether and when)
const reasons: Record<StaticReason, string> = {
  'reduced-motion': 'Reduced motion is on, so ARIS-1 holds still and solar flight is off.',
  'save-data': 'Data saver is on, so ARIS-1 stays a still image.',
  'no-webgl': 'This browser has no WebGL 2, so ARIS-1 stays a still image.',
  'no-gpu': '3D needs a hardware-accelerated GPU, so ARIS-1 is shown as a still.',
  failed: 'ARIS-1 could not start its 3D systems.',
};
function markStatic(reason: StaticReason) {
  telemetry.sys = 'STATIC';
  document.querySelectorAll<HTMLButtonElement>('[data-mode="solar"]').forEach((b) => { b.disabled = true; b.title = reasons[reason]; });
  document.querySelectorAll<HTMLElement>('[data-static-note]').forEach((n) => { n.hidden = false; n.textContent = reasons[reason]; });
  document.querySelectorAll<HTMLElement>('[data-needs-3d]').forEach((n) => { n.hidden = true; });
}

async function load() {
  if (!slot) return null;
  aris = await loadAris(() => ({
    slot, telemetry, solar: true, events: { onPoke, onArrive, onDepart },
    greeting: `ARIS-1 online. ${fine ? 'Hover' : 'Tap'} a card and I will scan it.`,
  }), markStatic);
  attachNarration(aris);
  return aris;
}
if (staticReason) markStatic(staticReason);
else scheduleAris(() => { load(); });

// ---- telemetry HUD, a few times a second
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
  set('scan', scanState.state === 'SCANNING' ? `SCANNING ${Math.round(scanProgress(now) * 100)}%` : scanState.state);
  set('target', scanState.target);
  set('fps', telemetry.fps ? String(Math.round(telemetry.fps)) : '—');
  set('met', `${String(Math.floor(met / 60)).padStart(2, '0')}:${String(met % 60).padStart(2, '0')}`);
  set('distance', `${(telemetry.distance / 7).toFixed(2)} AU`);
}
setInterval(render, 125);
render();

// ---- scan targets: ARIS-1 flies next to the card it scans
bindTargets(document, () => aris, { hover: 'fly', fine });

// ---- speaker buttons: read one card on request, with ARIS-1 turned toward it
bindReadButtons(document, (btn) => btn.closest<HTMLElement>('[data-scan]')?.dataset.scanSay ?? '', (btn, done) => {
  const card = btn.closest<HTMLElement>('[data-scan]');
  if (!card) return;
  aris?.watch(card);
  done.then(() => aris?.watch(null));
});

// ---- quick actions
async function scanAll() {
  const run = newSequence();
  const cards = [...document.querySelectorAll<HTMLElement>('#specs [data-scan]')];
  const intro = narrate(`Scanning all ${cards.length} system modules.`, { callout: 'Scanning all modules' });
  emit('aris:goto', 'specs');
  await Promise.all([wait(1100), intro]);
  for (const card of cards) {
    if (!isCurrent(run)) return;
    // Each module gets at least its scan, and with the voice on, its whole reading.
    await Promise.all([wait(2900), scanCard(card, { ms: 2400 })]);
  }
  if (isCurrent(run)) narrate('Scan complete. Four modules, all nominal.', { callout: 'Scan complete · all nominal' });
}
document.querySelectorAll('[data-action="scan-all"]').forEach((b) => b.addEventListener('click', () => { sfx.play('click'); scanAll(); }));

// ---- inspection controls: each part also names the module it stands for
let inspectTimer = 0;
const inspectButtons = document.querySelectorAll<HTMLButtonElement>('[data-inspect]');
async function inspect(part: Part | null) {
  clearTimeout(inspectTimer);
  inspectButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.inspect === part)));
  if (!part) { aris?.inspect(null); return; }
  newSequence();
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
bindAudioToggles((kind, on) => {
  if (kind === 'voice' && on) narrate('Voice assistant online. Click a module or mission and I will read it to you.', { callout: 'Voice assistant online' });
  render();
});

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
  scanState.target = w.name.toUpperCase();
  if (brief.status) brief.status.textContent = `En route · ${w.name}`;
  sfx.play('thrust');
  destButtons.forEach((b) => b.toggleAttribute('aria-current', b.dataset.waypoint === id));
}
function onArrive(id: Waypoint, queue = false) {
  const w = byId[id];
  scanState.target = w.name.toUpperCase();
  if (brief.title) brief.title.textContent = `${w.name} · ${w.title}`;
  if (brief.text) brief.text.textContent = w.brief;
  if (brief.land) { brief.land.href = `#${w.section}`; brief.land.dataset.section = w.section; }
  if (brief.status) brief.status.textContent = `In orbit · ${w.name}`;
  destButtons.forEach((b) => b.toggleAttribute('aria-current', b.dataset.waypoint === id));
  sfx.play('arrive');
  const reading = narrate(`${w.name}. ${w.title}. ${w.brief}`, { callout: false, queue });
  if (tour) {
    clearTimeout(tourTimer);
    // The tour moves on once the brief has been read (or after a pause, with the voice off).
    reading.then(() => {
      if (!tour || mode !== 'solar' || aris?.destination !== id) return;
      tourTimer = window.setTimeout(() => {
        if (!tour || mode !== 'solar') return;
        go(order[(order.indexOf(id) + 1) % order.length], true);
      }, voice.on ? 2500 : 6500);
    });
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
  newSequence();
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
  onArrive(a.destination, true);
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
  scanState.target = '—';
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

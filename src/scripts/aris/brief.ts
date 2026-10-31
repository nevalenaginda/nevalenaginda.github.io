// ARIS-1 on a case study: a reading companion. It docks in the reading guide (or peeks from the
// corner on phones), sweeps the product screenshot on arrival, locks on to each part as you reach
// it, scans the trade-off cards, points at the links, and celebrates at the end. What it says also
// goes to a screen-reader live region; voice and sound follow the header toggles, and each part
// has a button that reads it aloud.
import { bindAudioToggles, sfx, voice } from './audio';
import { fine, loadAris, scheduleAris, staticReason } from './boot';
import { attachNarration, narrate } from './narration';
import { bindTargets } from './targets';
import type { Aris } from './types';

const slot = document.querySelector<HTMLElement>('[data-guide-aris]');
const shot = document.querySelector<HTMLElement>('[data-brief-shot]');
const article = document.querySelector<HTMLElement>('.case-study');
const fab = document.querySelector<HTMLElement>('[data-guide-fab]');
const nextCard = document.querySelector<HTMLElement>('[data-next-mission]');
const title = document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? 'this mission';
const parts = document.querySelectorAll('[data-brief-section]').length;
const minutes = Number(document.querySelector<HTMLElement>('[data-guide]')?.dataset.intro?.match(/^\d+/)?.[0] ?? 1);
const wide = matchMedia('(min-width: 1024px)');

let aris: Aris | null = null;
const robot = () => aris;
const onScreen = (el: Element) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

// ---- the 3D robot, docked in the guide card
function onReady() {
  // After the greeting, fly over and sweep the product screenshot, if it is still in view.
  setTimeout(() => {
    if (!aris || !shot || !onScreen(shot)) return;
    aris.scan(shot, 2200);
    aris.say('Scanning the public product page', 2200);
    sfx.play('scan');
    setTimeout(() => aris?.attend(null), 2500);
  }, 1300);
}
function onPoke() {
  // Phones have no guide card: the robot itself opens the guide.
  if (!wide.matches) { document.dispatchEvent(new CustomEvent('brief:open-guide')); return; }
  sfx.play('thrust');
  narrate("I'm ARIS-1. I follow along as you read: hover a trade-off to scan it, or press a speaker to hear a part.", { callout: 'Hello! I read along with you 👋' });
}
// On phones the robot peeks from the right corner, so the guide button moves to the left.
const syncFab = () => fab?.classList.toggle('guide-fab--live', !!aris && !wide.matches);
wide.addEventListener('change', syncFab);

if (slot && !staticReason) {
  scheduleAris(() => {
    loadAris(() => ({
      slot,
      greeting: `Mission brief: ${title}. ${parts} parts, about ${minutes} min.`,
      events: { onPoke, onReady },
    }), () => {}).then((a) => {
      aris = a;
      attachNarration(a);
      if (!a) return;
      slot.setAttribute('data-live', '');
      syncFab();
    });
  });
} else if (shot) {
  // No robot here (reduced motion, data saver, no WebGL): the screenshot sweeps itself once.
  setTimeout(() => {
    const sweep = document.createElement('span');
    sweep.className = 'scan-sweep';
    sweep.setAttribute('aria-hidden', 'true');
    shot.append(sweep);
    setTimeout(() => sweep.remove(), 2600);
  }, 900);
}

// ---- following the reader: one lock-on per part, a celebration at the end
let finished = false;
document.addEventListener('brief:section', (e) => {
  const { index, total, id, title: part, done, first } = (e as CustomEvent<{ index: number; total: number; id: string; title: string; done: boolean; first: boolean }>).detail;
  if (first) return;
  if (done) { finish(); return; }
  const heading = id ? document.getElementById(id) : null;
  if (index < 0 || !heading) return;
  aris?.nod();
  aris?.ping(heading, 1300);
  aris?.say(`Now: ${part} · ${index + 1}/${total}`, 2400);
  sfx.play('tick');
  narrate(`Part ${index + 1} of ${total}: ${part}.`, { callout: false });
});

function finish() {
  if (finished) return;
  finished = true;
  aris?.celebrate();
  aris?.say('Mission brief complete', 2600);
  sfx.play('arrive');
  narrate('Mission brief complete.', { callout: false });
  if (nextCard) setTimeout(() => { if (onScreen(nextCard)) aris?.ping(nextCard, 1600); }, 1500);
}

// ---- trade-off cards: a sweep from the dock on hover, a full scan with narration on click
if (article) bindTargets(article, robot, { hover: 'ping', fine });

// ---- links: ARIS-1 turns and points at whatever you are about to open
document.querySelectorAll<HTMLElement>('[data-aris-point]').forEach((el) => {
  const on = () => aris?.point(el);
  const off = () => aris?.point(null);
  el.addEventListener('pointerenter', on);
  el.addEventListener('pointerleave', off);
  el.addEventListener('focus', on);
  el.addEventListener('blur', off);
});

// ---- when the reader sits still, ARIS-1 glances at the part being read
let lastMove = performance.now();
let glancing = false;
addEventListener('pointermove', () => {
  lastMove = performance.now();
  if (glancing) { glancing = false; aris?.watch(null); }
}, { passive: true });
setInterval(() => {
  if (!aris || glancing || performance.now() - lastMove < 7000) return;
  const heading = document.querySelector<HTMLElement>('[data-brief-section][data-active] h2');
  if (heading && onScreen(heading)) { glancing = true; aris.watch(heading); }
}, 2000);

// ---- "read this part aloud": an explicit request, so it speaks even with the voice toggle off
let reading: HTMLButtonElement | null = null;
const stopReading = () => {
  reading?.setAttribute('aria-pressed', 'false');
  reading = null;
  aris?.talk(false);
};
document.querySelectorAll<HTMLButtonElement>('[data-read-part]').forEach((btn) => {
  if (!voice.available) return;
  btn.hidden = false;
  btn.setAttribute('aria-pressed', 'false');
  btn.addEventListener('click', () => {
    const section = btn.closest<HTMLElement>('[data-brief-section]');
    if (!section) return;
    if (reading === btn) { voice.stop(); stopReading(); return; }
    stopReading();
    const text = [...section.querySelectorAll('h2, p, li')].map((el) => el.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean).join('. ');
    const heading = section.querySelector<HTMLElement>('h2');
    reading = btn;
    btn.setAttribute('aria-pressed', 'true');
    aris?.talk(true);
    if (heading) aris?.watch(heading);
    aris?.say(`Reading: ${heading?.textContent?.replace(/\s+/g, ' ').trim() ?? 'this part'}`, 2600);
    sfx.play('click');
    voice.read(text, () => { if (reading === btn) stopReading(); });
  });
});

// ---- voice and sound toggles in the header
bindAudioToggles((kind, on) => {
  if (kind === 'voice' && on) narrate('Voice assistant online. I will announce each part as you reach it.', { callout: 'Voice assistant online' });
});

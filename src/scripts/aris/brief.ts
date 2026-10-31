// ARIS-1 on a case study: a reading companion. It docks in the reading guide (or peeks from the
// corner on phones), sweeps the product screenshot on arrival, locks on to each part as you reach
// it, scans the trade-off cards, points at the links, and celebrates at the end.
// Voice, the same model as the home page (audio.ts): with the voice on, ARIS-1 reads the part you
// stop on, in full; "Listen to this brief" reads from there to the end and scrolls along; each
// part's speaker reads it on request. If the browser still needs a first click before it may
// speak, the guide asks for one.
import { bindAudioToggles, sfx, voice } from './audio';
import { fine, loadAris, scheduleAris, staticReason } from './boot';
import { attachNarration, narrate } from './narration';
import { bindReadButtons } from './read-buttons';
import { speech, type SpeechOutcome } from './speech';
import { bindTargets } from './targets';
import type { Aris } from './types';

const slot = document.querySelector<HTMLElement>('[data-guide-aris]');
const shot = document.querySelector<HTMLElement>('[data-brief-shot]');
const article = document.querySelector<HTMLElement>('.case-study');
const fab = document.querySelector<HTMLElement>('[data-guide-fab]');
const nextCard = document.querySelector<HTMLElement>('[data-next-mission]');
const sections = [...document.querySelectorAll<HTMLElement>('[data-brief-section]')];
const total = sections.length;
const title = document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? 'this mission';
const minutes = Number(document.querySelector<HTMLElement>('[data-guide]')?.dataset.intro?.match(/^\d+/)?.[0] ?? 1);
const wide = matchMedia('(min-width: 1024px)');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let aris: Aris | null = null;
const robot = () => aris;
const onScreen = (el: Element) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
const heading = (i: number) => sections[i]?.querySelector<HTMLElement>('h2') ?? null;
const partTitle = (i: number) => heading(i)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

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
      greeting: `Mission brief: ${title}. ${total} parts, about ${minutes} min.`,
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

// ---- reading parts aloud
let active = -1;        // the part being read on screen
let finished = false;   // the reader has reached the end
let playing = false;    // "Listen to this brief" is running
let followTimer = 0;
const heard = new Set<number>();

/** Read part i in full, with ARIS-1 turned to it. */
async function readPart(i: number, source: string): Promise<SpeechOutcome> {
  const h = heading(i);
  if (h) aris?.watch(h);
  aris?.say(`Reading · ${partTitle(i)}`, 2600);
  narrate(`Reading part ${i + 1} of ${total}: ${partTitle(i)}.`, { speak: false, callout: false });
  const outcome = await speech.say(`Part ${i + 1} of ${total}. ${sections[i].dataset.readText ?? ''}`, { source });
  if (outcome === 'done') heard.add(i);
  aris?.watch(null);
  return outcome;
}

const endLine = () => speech.say('Mission brief complete.', { queue: true, source: 'end' });

/** With the voice on, read the part the reader settles on (scrolling past parts says nothing). */
function follow() {
  clearTimeout(followTimer);
  if (!voice.on || playing || active < 0) return;
  const i = active;
  followTimer = window.setTimeout(async () => {
    if (active !== i || playing || !voice.on || speech.source === `part-${i}`) return;
    const outcome = await readPart(i, `part-${i}`);
    if (outcome === 'done' && finished && i === total - 1) endLine();
  }, 1200);
}

/** "Listen to this brief": from the part on screen to the end, scrolling to each part. */
async function play() {
  if (playing) { stopPlay(true); return; }
  playing = true;
  clearTimeout(followTimer);
  syncPlay();
  // On phones the guide is a sheet over the article: close it so the reader sees what is read.
  document.querySelector<HTMLDialogElement>('[data-guide-sheet]')?.close();
  const start = Math.min(Math.max(active, 0), total - 1);
  for (let i = start; i < total; i++) {
    const h = heading(i);
    if (h && (i !== start || !onScreen(h))) {
      document.dispatchEvent(new CustomEvent('aris:goto', { detail: h.id }));
      await wait(900);
    }
    if (!playing) return;
    if (await readPart(i, 'play') !== 'done') { stopPlay(false); return; }
  }
  if (playing) await speech.say('Mission brief complete.', { source: 'play' });
  stopPlay(false);
}
function stopPlay(silence: boolean) {
  if (!playing) return;
  playing = false;
  if (silence) speech.stop();
  syncPlay();
}
function syncPlay() {
  document.querySelectorAll<HTMLElement>('[data-guide-play]').forEach((b) => b.setAttribute('aria-pressed', String(playing)));
  document.querySelectorAll<HTMLElement>('[data-guide-play-label]').forEach((l) => { l.textContent = playing ? 'Stop listening' : 'Listen to this brief'; });
}
// The guide exists twice (sidebar and phone sheet), so its buttons are handled by delegation.
document.addEventListener('click', (e) => {
  if ((e.target as Element).closest('[data-guide-play]')) { sfx.play('click'); play(); }
});
// Scrolling by hand takes over from "Listen to this brief"; the voice, if on, then follows.
const takeOver = () => { if (playing) stopPlay(true); };
addEventListener('wheel', takeOver, { passive: true });
addEventListener('touchmove', takeOver, { passive: true });
addEventListener('keydown', (e) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) takeOver(); });

// Each part's speaker reads that part on request, voice toggle or not.
if (article) bindReadButtons(article, (btn) => btn.closest<HTMLElement>('[data-brief-section]')?.dataset.readText ?? '', (btn, done) => {
  const h = btn.closest('[data-brief-section]')?.querySelector<HTMLElement>('h2');
  if (h) aris?.watch(h);
  aris?.say(`Reading · ${h?.textContent?.replace(/\s+/g, ' ').trim() ?? 'this part'}`, 2600);
  done.then(() => aris?.watch(null));
});

// The browser wants a first click before it may speak: say so, and start reading once it comes.
document.addEventListener('speech:blocked', () => {
  if (!voice.on) return;
  narrate('Voice is on. Tap or click anywhere to let ARIS-1 read aloud.', { speak: false, callout: 'Tap anywhere to let me read aloud', ms: 5000 });
});
document.addEventListener('speech:unblocked', () => {
  setTimeout(() => { if (voice.on && !playing && !speech.speaking) follow(); }, 250);
});

// ---- following the reader: one lock-on per part, a celebration at the end
document.addEventListener('brief:section', (e) => {
  const { index, total: count, id, title: part, done, first } = (e as CustomEvent<{ index: number; total: number; id: string; title: string; done: boolean; first: boolean }>).detail;
  active = index;
  if (done) { finish(); return; }
  if (first) { follow(); return; }
  const h = id ? document.getElementById(id) : null;
  if (index < 0 || !h) return;
  aris?.nod();
  aris?.ping(h, 1300);
  aris?.say(`Now: ${part} · ${index + 1}/${count}`, 2400);
  sfx.play('tick');
  narrate(`Part ${index + 1} of ${count}: ${part}.`, { speak: false, callout: false });
  follow();
});

function finish() {
  if (finished) return;
  finished = true;
  aris?.celebrate();
  aris?.say('Mission brief complete', 2600);
  sfx.play('arrive');
  narrate('Mission brief complete.', { speak: false, callout: false });
  // With the voice on, the last part is read first (follow), then the closing line.
  if (voice.on && !playing) {
    if (heard.has(total - 1) && !speech.speaking) endLine();
    else follow();
  }
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
  if (!aris || glancing || speech.speaking || performance.now() - lastMove < 7000) return;
  const h = document.querySelector<HTMLElement>('[data-brief-section][data-active] h2');
  if (h && onScreen(h)) { glancing = true; aris.watch(h); }
}, 2000);

// ---- voice and sound toggles in the header
bindAudioToggles(async (kind, on) => {
  if (kind !== 'voice' || !on) return;
  const outcome = await narrate('Voice assistant online. I will read each part as you reach it.', { callout: 'Voice assistant online' });
  if (outcome === 'done') follow();
});

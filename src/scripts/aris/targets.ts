// Elements ARIS-1 can scan ([data-scan]). Hover (with a little intent) gets a glance, keyboard focus
// gets attention, and a [data-scan-btn] or a click on a [data-scan-click] card gets a full scan with
// narration. Without the robot the card sweeps itself and the narration still runs.
import { sfx } from './audio';
import { narrate } from './narration';
import type { Aris } from './types';

/** Scan status for a HUD. */
export const scanState = { state: 'STANDBY', target: '—', started: 0, ms: 0 };
export const scanProgress = (now: number) => (scanState.state === 'SCANNING' ? Math.min(1, (now - scanState.started) / scanState.ms) : scanState.state === 'LOCKED' ? 1 : 0);

let aris: () => Aris | null = () => null;
let hoverTimer = 0, releaseTimer = 0, lockTimer = 0;
let current: HTMLElement | null = null;
let busyUntil = 0; // a full scan keeps ARIS-1 on its card until it is done
let sequence = 0;  // bumps to cancel a running sequence of scans

/** Start a new run of scans; any older run sees it is no longer current. */
export const newSequence = () => ++sequence;
export const isCurrent = (run: number) => run === sequence;

const label = (el: HTMLElement) => el.dataset.scanLabel ?? 'Target';

function setScan(state: string, el: HTMLElement | null, ms = 0) {
  Object.assign(scanState, { state, target: el ? label(el) : '—', started: performance.now(), ms });
}

function attend(el: HTMLElement) {
  clearTimeout(releaseTimer);
  if (performance.now() < busyUntil && current !== el) return;
  current = el;
  aris()?.attend(el);
}
function release(delay = 900) {
  clearTimeout(releaseTimer);
  releaseTimer = window.setTimeout(() => {
    if (performance.now() < busyUntil) return release(busyUntil - performance.now() + 200);
    current = null;
    aris()?.attend(null);
    aris()?.watch(null);
  }, delay);
}
function lockAfter(ms: number, hold: number) {
  clearTimeout(lockTimer);
  lockTimer = window.setTimeout(() => {
    scanState.state = 'LOCKED';
    lockTimer = window.setTimeout(() => setScan('STANDBY', null), hold);
  }, ms);
}

/** A full scan: fly over, sweep, read the card aloud. */
export function scanCard(el: HTMLElement, { ms = 2600 } = {}) {
  current = el;
  busyUntil = performance.now() + ms;
  document.querySelectorAll('[data-scanning]').forEach((c) => c !== el && c.removeAttribute('data-scanning'));
  el.setAttribute('data-scanning', '');
  const a = aris();
  if (a) a.scan(el, ms);
  else {
    // Without the robot the card sweeps itself.
    el.querySelector('.scan-sweep')?.remove();
    const sweep = document.createElement('span');
    sweep.className = 'scan-sweep';
    sweep.setAttribute('aria-hidden', 'true');
    el.append(sweep);
    setTimeout(() => sweep.remove(), 2600);
  }
  setScan('SCANNING', el, ms);
  sfx.play('scan');
  narrate(el.dataset.scanSay ?? label(el), { callout: `Scanning · ${label(el)}` });
  lockAfter(ms, 2400);
  window.setTimeout(() => {
    el.removeAttribute('data-scanning');
    if (!el.matches(':hover, :focus-within')) release(1200);
  }, ms);
}

/**
 * Wire up every [data-scan] element inside `scope`.
 * hover 'fly': ARIS-1 flies next to a hovered card and glances at it (the home page).
 * hover 'ping': ARIS-1 stays where it is, turns and sweeps the card from there (reading pages).
 */
export function bindTargets(scope: ParentNode, robot: () => Aris | null, { hover = 'fly' as 'fly' | 'ping', fine = true } = {}) {
  aris = robot;
  const glance = (el: HTMLElement) => {
    if (performance.now() < busyUntil) return;
    if (hover === 'fly') { attend(el); aris()?.scan(el, 2400); }
    else { clearTimeout(releaseTimer); aris()?.ping(el, 1800); }
    setScan('SCANNING', el, hover === 'fly' ? 2400 : 1800);
    lockAfter(hover === 'fly' ? 2400 : 1800, 1800);
    sfx.play('tick');
  };
  scope.querySelectorAll<HTMLElement>('[data-scan]').forEach((card) => {
    if (fine) {
      card.addEventListener('pointerenter', () => {
        clearTimeout(hoverTimer);
        if (hover === 'ping') aris()?.watch(card);
        hoverTimer = window.setTimeout(() => glance(card), 260);
      });
      card.addEventListener('pointerleave', () => { clearTimeout(hoverTimer); release(hover === 'ping' ? 400 : 900); });
    }
    card.addEventListener('focusin', () => {
      if (!card.matches(':focus-visible, :has(:focus-visible)')) return;
      if (hover === 'fly') attend(card);
      else { clearTimeout(releaseTimer); aris()?.watch(card); }
    });
    card.addEventListener('focusout', () => release());
    card.querySelectorAll('[data-scan-btn]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      newSequence();
      scanCard(card);
    }));
    // Cards without a link of their own scan on a click anywhere.
    if ('scanClick' in card.dataset) card.addEventListener('click', (e) => {
      if ((e.target as Element).closest('a, button')) return;
      newSequence();
      scanCard(card);
    });
  });
}

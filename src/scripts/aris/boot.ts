// Whether and when ARIS-1's 3D layer loads: the same rules on every page. Reduced motion, data
// saver and browsers without WebGL 2 keep the poster; desktops load once the page is idle, and
// phones on the first touch or scroll, so Three.js never competes with first paint.
import type { Aris, MountOptions } from './types';

export type StaticReason = 'reduced-motion' | 'save-data' | 'no-webgl' | 'no-gpu' | 'failed';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

export const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Why the 3D layer cannot run here, or null when it can. */
export const staticReason: StaticReason | null = reduce ? 'reduced-motion' : saveData ? 'save-data' : 'WebGL2RenderingContext' in window ? null : 'no-webgl';

let loading: Promise<Aris | null> | null = null;

/** Load the 3D layer once and mount ARIS-1; resolves to null (and reports why) when it cannot run. */
export function loadAris(options: () => MountOptions, onStatic: (reason: StaticReason) => void) {
  if (staticReason) return Promise.resolve(null);
  loading ??= import('./webgl').then(({ mountAris }) => {
    const aris = mountAris(options());
    if (!aris) onStatic('no-gpu');
    return aris;
  }).catch(() => { onStatic('failed'); return null; });
  return loading;
}

/** Run `load` when the page can afford it: idle on desktops, first interaction on touch devices. */
export function scheduleAris(load: () => void) {
  if (staticReason) return;
  if (fine) {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300));
    if (document.readyState === 'complete') idle(load);
    else addEventListener('load', () => idle(load), { once: true });
  } else {
    for (const type of ['pointerdown', 'touchstart', 'scroll', 'keydown']) addEventListener(type, load, { once: true, passive: true });
  }
}

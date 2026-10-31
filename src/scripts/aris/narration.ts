// What ARIS-1 says goes three ways: a live region for screen readers ([data-aris-readout]), the
// callout next to the robot, and the voice when it is switched on.
import { voice } from './audio';
import type { Aris } from './types';

let aris: Aris | null = null;
const readouts = () => document.querySelectorAll<HTMLElement>('[data-aris-readout]');

/** Route callouts to the robot once it has mounted. */
export function attachNarration(a: Aris | null) { aris = a; }

export function narrate(text: string, { speak = true, callout = text, ms = 3600 }: { speak?: boolean; callout?: string | false; ms?: number } = {}) {
  readouts().forEach((r) => { r.textContent = text; });
  if (callout) aris?.say(callout, ms);
  if (speak) voice.speak(text);
}

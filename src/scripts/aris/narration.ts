// What ARIS-1 says goes three ways: a live region for screen readers ([data-aris-readout]), the
// callout next to the robot, and the voice when it is switched on. While anything is spoken, the
// robot's visor flickers along.
import { voice } from './audio';
import { speech, type SpeechOutcome } from './speech';
import type { Aris } from './types';

let aris: Aris | null = null;
const readouts = () => document.querySelectorAll<HTMLElement>('[data-aris-readout]');

document.addEventListener('speech:start', () => aris?.talk(true));
document.addEventListener('speech:end', () => aris?.talk(speech.speaking));

/** Route callouts to the robot once it has mounted. */
export function attachNarration(a: Aris | null) {
  aris = a;
  a?.talk(speech.speaking);
}

/**
 * Narrate a line. It is spoken only with the voice switched on; the promise settles when the
 * speech ends (or at once when nothing is spoken), so a sequence can wait for it.
 * `queue` waits for the current speech instead of replacing it.
 */
export function narrate(text: string, { speak = true, callout = text, ms = 3600, queue = false }: { speak?: boolean; callout?: string | false; ms?: number; queue?: boolean } = {}): Promise<SpeechOutcome | null> {
  readouts().forEach((r) => { r.textContent = text; });
  if (callout) aris?.say(callout, ms);
  return speak && voice.on ? speech.say(text, { queue, source: 'narration' }) : Promise.resolve(null);
}

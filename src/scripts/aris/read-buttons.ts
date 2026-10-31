// Speaker buttons ([data-read-btn]) on every readable card or part. Pressing one is an explicit ask,
// so it reads even with the voice toggle off; pressing it again stops. CSS shows the buttons only
// where the browser can speak (:root[data-speech]).
import { speech, type SpeechOutcome } from './speech';

let ids = 0;
const buttons: HTMLButtonElement[] = [];

function sync() {
  const active = speech.source;
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(!!active && b.dataset.readSource === active)));
}
document.addEventListener('speech:start', sync);
document.addEventListener('speech:end', sync);

/**
 * Wire the speaker buttons inside `scope`. `text` gives what a button reads; `onRead` runs as it
 * starts (to point the robot at the content) and gets the outcome when it ends.
 */
export function bindReadButtons(scope: ParentNode, text: (btn: HTMLButtonElement) => string, onRead?: (btn: HTMLButtonElement, done: Promise<SpeechOutcome>) => void) {
  scope.querySelectorAll<HTMLButtonElement>('[data-read-btn]').forEach((btn) => {
    const source = `read-${++ids}`;
    btn.dataset.readSource = source;
    btn.setAttribute('aria-pressed', 'false');
    buttons.push(btn);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (speech.source === source) { speech.stop(); return; }
      const done = speech.say(text(btn), { source });
      onRead?.(btn, done);
    });
  });
}

// ARIS-1's voice: Web Speech synthesis with a queue. Text is spoken sentence by sentence, because
// Chrome stops a single long utterance after about 15 seconds, and every request returns a promise
// that settles when the speech is done, interrupted or blocked, so a sequence can wait for it.
// A new request replaces the one being spoken unless it asks to queue. Pages follow along through
// `speech:start`, `speech:end`, `speech:blocked` and `speech:unblocked` events on document.

export type SpeechOutcome = 'done' | 'interrupted' | 'blocked' | 'unavailable';
type Job = { chunks: string[]; resolve: (outcome: SpeechOutcome) => void; source?: string };

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
// Lets CSS show speaker controls only where the browser can speak.
if (synth) document.documentElement.dataset.speech = '';

let chosen: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (!synth) return null;
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const prefer = [/Google UK English Male/i, /Daniel/i, /Microsoft (Guy|Ryan|Andrew)/i, /Google US English/i, /Alex/i, /Samantha/i];
  for (const re of prefer) { const v = voices.find((x) => re.test(x.name)); if (v) return v; }
  return voices[0] ?? null;
}
synth?.addEventListener?.('voiceschanged', () => { chosen = pickVoice(); });

/** Sentence-sized pieces of at most `max` characters; short sentences ride along with the next. */
export function chunk(text: string, max = 180) {
  // A boundary is end punctuation followed by a space and a capital, digit or quote, so "Node.js"
  // and "2.5%" stay whole. (No lookbehind: older Safari cannot parse it.)
  const sentences = text.replace(/\s+/g, ' ').trim().replace(/([.!?])\s+(?=[A-Z0-9"“(])/g, '$1\u0000').split('\u0000');
  const out: string[] = [];
  for (let s of sentences.map((x) => x.trim()).filter(Boolean)) {
    while (s.length > max) {
      let cut = s.lastIndexOf(', ', max);
      if (cut < max * 0.4) cut = s.lastIndexOf(' ', max);
      if (cut <= 0) cut = max;
      out.push(s.slice(0, cut + 1).trim());
      s = s.slice(cut + 1).trim();
    }
    const last = out[out.length - 1];
    if (last && last.length < 60 && last.length + s.length + 1 <= max) out[out.length - 1] = `${last} ${s}`;
    else if (s) out.push(s);
  }
  return out;
}

const emit = (name: string, detail?: unknown) => document.dispatchEvent(new CustomEvent(name, { detail }));

let current: Job | null = null;
let starting: { job: Job; timer: number } | null = null;
const waiting: Job[] = [];
let watchdog = 0;
let blocked = false;

function setBlocked(on: boolean) {
  if (blocked === on) return;
  blocked = on;
  document.documentElement.toggleAttribute('data-speech-blocked', on);
  emit(on ? 'speech:blocked' : 'speech:unblocked');
}
// Chrome (and Safari) refuse to speak before the visitor has clicked or typed on the page;
// scrolling does not count. Any such gesture clears the block.
const activated = () => (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;
for (const type of ['pointerdown', 'pointerup', 'keydown']) {
  addEventListener(type, () => { if (blocked) setTimeout(() => { if (activated()) setBlocked(false); }); }, { capture: true, passive: true });
}

function finish(job: Job, outcome: SpeechOutcome) {
  if (current === job) {
    current = null;
    clearTimeout(watchdog);
    emit('speech:end', { source: job.source, outcome });
  }
  job.resolve(outcome);
}

function run(job: Job) {
  current = job;
  emit('speech:start', { source: job.source });
  speakChunk(job, 0);
}

function speakChunk(job: Job, i: number) {
  if (current !== job || !synth) return;
  if (i >= job.chunks.length) {
    finish(job, 'done');
    const next = waiting.shift();
    if (next) run(next);
    return;
  }
  chosen ??= pickVoice();
  const u = new SpeechSynthesisUtterance(job.chunks[i]);
  if (chosen) u.voice = chosen;
  u.lang = chosen?.lang ?? 'en-US';
  u.rate = 1.02;
  u.pitch = 0.82;
  let settled = false;
  const advance = () => {
    if (settled) return;
    settled = true;
    clearTimeout(watchdog);
    speakChunk(job, i + 1);
  };
  u.onend = advance;
  u.onerror = (e) => {
    if (settled) return;
    if (e.error === 'interrupted' || e.error === 'canceled') return; // cancelled here; the canceller settles the job
    settled = true;
    clearTimeout(watchdog);
    if (e.error === 'not-allowed') { setBlocked(true); stopAll('blocked'); return; }
    speakChunk(job, i + 1); // skip a piece the engine could not say
  };
  // Some engines never send `end`; move on after a generous estimate of the speaking time.
  clearTimeout(watchdog);
  watchdog = window.setTimeout(advance, Math.max(3500, job.chunks[i].length * 95));
  synth.speak(u);
}

function stopAll(outcome: SpeechOutcome) {
  if (starting) { clearTimeout(starting.timer); starting.job.resolve(outcome); starting = null; }
  const old = current;
  current = null;
  clearTimeout(watchdog);
  if (old) { emit('speech:end', { source: old.source, outcome }); old.resolve(outcome); }
  waiting.splice(0).forEach((j) => j.resolve(outcome));
}

export const speech = {
  get available() { return !!synth; },
  get blocked() { return blocked; },
  get speaking() { return !!(current || starting); },
  /** The `source` of what is being spoken, so a button can tell it is the one talking. */
  get source() { return (current ?? starting?.job)?.source; },
  /** Speak `text`, replacing what is being said, or after it with `queue`. */
  say(text: string, { queue = false, source }: { queue?: boolean; source?: string } = {}): Promise<SpeechOutcome> {
    if (!synth) return Promise.resolve('unavailable');
    const chunks = chunk(text);
    if (!chunks.length) return Promise.resolve('done');
    if (!activated()) { setBlocked(true); return Promise.resolve('blocked'); }
    setBlocked(false);
    return new Promise((resolve) => {
      const job: Job = { chunks, resolve, source };
      if (queue && (current || starting || waiting.length)) { waiting.push(job); return; }
      const busy = !!(current || starting) || synth.speaking || synth.pending;
      stopAll('interrupted');
      if (!busy) { run(job); return; }
      synth.cancel();
      // Safari can swallow an utterance spoken right after cancel(), so give it a moment.
      starting = { job, timer: window.setTimeout(() => { starting = null; run(job); }, 60) };
    });
  },
  stop() {
    if (!synth) return;
    const busy = speech.speaking || synth.speaking || synth.pending;
    stopAll('interrupted');
    if (busy) synth.cancel();
  },
};

// Escape always silences ARIS-1.
addEventListener('keydown', (e) => { if (e.key === 'Escape' && speech.speaking) speech.stop(); });

// ARIS-1's voice (Web Speech synthesis) and sound effects (Web Audio oscillators and filtered
// noise, no audio files). Both start switched off: browsers only allow sound after a click, and a
// portfolio should not beep at someone in an office. The choice is remembered per browser.

const store = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
};

// ---- voice
let voiceOn = store.get('aris:voice') === 'on';
let chosen: SpeechSynthesisVoice | null = null;
const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice() {
  if (!speechAvailable) return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const prefer = [/Google UK English Male/i, /Daniel/i, /Microsoft (Guy|Ryan|Andrew)/i, /Google US English/i, /Alex/i, /Samantha/i];
  for (const re of prefer) { const v = voices.find((x) => re.test(x.name)); if (v) return v; }
  return voices[0] ?? null;
}
if (speechAvailable) speechSynthesis.addEventListener?.('voiceschanged', () => { chosen = pickVoice(); });

function utter(text: string, onEnd?: () => void) {
  chosen ??= pickVoice();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (chosen) u.voice = chosen;
  u.lang = chosen?.lang ?? 'en-US';
  u.rate = 1.02;
  u.pitch = 0.82;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  speechSynthesis.speak(u);
}

export const voice = {
  available: speechAvailable,
  get on() { return voiceOn && speechAvailable; },
  set(on: boolean) {
    voiceOn = on;
    store.set('aris:voice', on ? 'on' : 'off');
    if (!on) voice.stop();
  },
  /** Automatic narration: only when the voice is switched on. */
  speak(text: string) {
    if (voice.on) utter(text);
  },
  /** An explicit "read this" request: speaks even with the voice switched off. */
  read(text: string, onEnd?: () => void) {
    if (speechAvailable) utter(text, onEnd);
    else onEnd?.();
  },
  stop() { if (speechAvailable) speechSynthesis.cancel(); },
};

// ---- sound effects
let sfxOn = store.get('aris:sfx') === 'on';
let ctx: AudioContext | undefined;
let out: GainNode | undefined;
let noiseBuf: AudioBuffer | undefined;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    out = ctx.createGain();
    out.gain.value = 0.32;
    out.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** One oscillator note with an attack-decay envelope and an optional pitch glide. */
function tone(type: OscillatorType, from: number, to: number, start: number, dur: number, gain: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, start);
  if (to !== from) o.frequency.exponentialRampToValueAtTime(to, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.012, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(out!);
  o.start(start);
  o.stop(start + dur + 0.02);
  return o;
}

/** Filtered noise: whooshes and thruster burns. */
function hiss(start: number, dur: number, gain: number, f1: number, f2: number, q = 1.2) {
  const c = ctx!;
  const n = c.createBufferSource();
  n.buffer = noiseBuf!;
  n.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f1, start);
  f.frequency.exponentialRampToValueAtTime(f2, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  n.connect(f).connect(g).connect(out!);
  n.start(start);
  n.stop(start + dur + 0.05);
}

const sounds = {
  tick(t: number) { tone('sine', 2200, 2200, t, 0.03, 0.035); },
  click(t: number) { tone('square', 1100, 1100, t, 0.045, 0.06); tone('square', 1650, 1650, t + 0.05, 0.05, 0.05); },
  toggle(t: number) { tone('triangle', 660, 990, t, 0.12, 0.12); },
  scan(t: number) {
    const o = tone('sawtooth', 240, 960, t, 0.9, 0.05);
    // A fast wobble on the pitch makes it read as a scanner rather than a siren.
    const lfo = ctx!.createOscillator();
    const depth = ctx!.createGain();
    lfo.frequency.value = 22;
    depth.gain.value = 40;
    lfo.connect(depth).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + 0.95);
    tone('sine', 1760, 1760, t + 0.92, 0.12, 0.06);
  },
  inspect(t: number) { tone('triangle', 520, 520, t, 0.08, 0.1); tone('triangle', 780, 780, t + 0.09, 0.08, 0.1); tone('triangle', 1040, 1040, t + 0.18, 0.14, 0.09); },
  thrust(t: number) { hiss(t, 0.7, 0.22, 300, 1400, 0.8); },
  warp(t: number) { hiss(t, 1.5, 0.3, 160, 4200, 1.6); tone('sine', 70, 620, t, 1.4, 0.12); },
  boot(t: number) { [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f, t + i * 0.08, 0.16, 0.08)); },
  arrive(t: number) { tone('sine', 880, 880, t, 0.25, 0.09); tone('sine', 1320, 1320, t + 0.12, 0.35, 0.07); },
  transmit(t: number) { for (let i = 0; i < 10; i++) { const f = 900 + Math.random() * 1600; tone('square', f, f, t + i * 0.055, 0.05, 0.035); } },
  error(t: number) { tone('square', 140, 110, t, 0.28, 0.09); },
};
export type Sound = keyof typeof sounds;

export const sfx = {
  get on() { return sfxOn; },
  set(on: boolean) {
    sfxOn = on;
    store.set('aris:sfx', on ? 'on' : 'off');
    if (on) sfx.play('toggle');
  },
  play(name: Sound) {
    if (!sfxOn) return;
    const c = audio();
    if (!c) return;
    sounds[name](c.currentTime + 0.01);
  },
};

/** Wire the voice and sound toggles ([data-audio-toggle="voice" | "sfx"]) in the header and HUD. */
export function bindAudioToggles(onChange?: (kind: 'voice' | 'sfx', on: boolean) => void) {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-audio-toggle]');
  const sync = () => buttons.forEach((b) => {
    const on = b.dataset.audioToggle === 'voice' ? voice.on : sfx.on;
    b.setAttribute('aria-pressed', String(on));
    b.querySelectorAll('[data-audio-state]').forEach((s) => { s.textContent = on ? 'On' : 'Off'; });
  });
  buttons.forEach((b) => {
    const kind = b.dataset.audioToggle === 'voice' ? 'voice' : 'sfx';
    if (kind === 'voice' && !voice.available) { b.disabled = true; b.title = 'This browser has no speech synthesis.'; }
    b.addEventListener('click', () => {
      if (kind === 'voice') voice.set(!voice.on); else sfx.set(!sfx.on);
      sync();
      onChange?.(kind, kind === 'voice' ? voice.on : sfx.on);
    });
  });
  sync();
}

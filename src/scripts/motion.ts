// Smooth scroll and scroll-driven UI animation for every page except /cv.
// Markup opts in with data attributes so pages stay plain HTML:
//   data-reveal           rise and fade into view
//   data-reveal="card"    cards and list items: rise, untilt, staggered
//   data-reveal="image"   a picture frame opens from the middle while its image settles
//   data-split            the hero name: words rise into place (never hidden: it is the LCP)
//   data-split="mask"     a heading whose words slide up out of a mask
//   data-count            count the first number in the text up from zero
//   data-parallax=n       drift at n × scroll speed
//   data-draw             grow a line from 0 to full height while scrolling past
//   data-tilt             tilt toward the pointer with a moving highlight (fine pointers only)
//   data-wash=<colour>    the page background shifts to this section's colour while it is read
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const mm = gsap.matchMedia();
const EASE = 'expo.out';

mm.add('(prefers-reduced-motion: reduce)', () => {
  // CSS already shows [data-reveal]; make sure nothing waits on JS either.
  gsap.set('[data-reveal]', { opacity: 1 });
});

mm.add('(prefers-reduced-motion: no-preference)', () => {
  const lenis = new Lenis({ lerp: 0.12, anchors: { offset: -88 } });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  splitWords();
  chapters();
  // Back from a case study: the page is already known, so skip the entrances.
  const returning = root.classList.contains('returning');

  // Each kind of element arrives in its own way, staggered when several enter together.
  if (!returning) revealAll();
  gsap.utils.toArray<HTMLElement>('[data-split]').forEach((heading) => {
    const words = heading.querySelectorAll('.word');
    if (heading.dataset.split === 'mask') {
      if (!returning) gsap.fromTo(words, { yPercent: 115 }, { yPercent: 0, duration: 1.05, ease: EASE, stagger: 0.05, scrollTrigger: { trigger: heading, start: 'top 88%', once: true } });
    } else {
      // The hero name: no opacity and no mask, so it paints on the first frame.
      gsap.from(words, { yPercent: 35, rotate: 4, duration: 1.1, delay: 0.05, ease: EASE, stagger: 0.07 });
    }
  });

  gsap.utils.toArray<HTMLElement>('[data-count]').forEach(countUp);

  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const speed = Number(el.dataset.parallax) || 0.1;
    // Drives --py, which the CSS wobble animation folds into its transform.
    gsap.fromTo(el, { '--py': '0px' }, { '--py': `${speed * 400}px`, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top top', end: 'bottom top', scrub: true } });
  });

  gsap.utils.toArray<HTMLElement>('[data-draw]').forEach((el) => {
    gsap.fromTo(el, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top 75%', end: 'bottom 60%', scrub: 0.6 } });
  });

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    gsap.utils.toArray<HTMLElement>('[data-tilt]').forEach(tilt);
    gsap.utils.toArray<HTMLElement>('.btn').forEach(magnetic);
  }

  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
    root.classList.remove('chapters');
  };
});

function revealAll() {
  ScrollTrigger.batch('[data-reveal=""], [data-reveal]:not([data-reveal="card"]):not([data-reveal="image"])', {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.07, overwrite: true }),
  });
  ScrollTrigger.batch('[data-reveal="card"]', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 48, rotate: 1.2 }, { opacity: 1, y: 0, rotate: 0, duration: 1.05, ease: EASE, stagger: 0.09, overwrite: true }),
  });
  gsap.utils.toArray<HTMLElement>('[data-reveal="image"]').forEach((frame) => {
    const img = frame.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 90%', once: true } });
    tl.fromTo(frame, { opacity: 0, clipPath: 'inset(14% 12% 14% 12% round 1.4rem)' }, { opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 1.4rem)', duration: 1.25, ease: EASE });
    if (img) tl.fromTo(img, { scale: 1.16 }, { scale: 1, duration: 1.4, ease: EASE }, 0);
  });
}

// One page background that changes colour as each section takes the middle of the screen.
function chapters() {
  const sections = document.querySelectorAll<HTMLElement>('[data-wash]');
  if (!sections.length) return;
  root.classList.add('chapters');
  sections.forEach((section) => {
    const wash = section.dataset.wash;
    const colour = wash === 'paper' ? 'var(--color-paper)' : `var(--color-wash-${wash})`;
    ScrollTrigger.create({
      trigger: section, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => { if (self.isActive) root.style.setProperty('--page-bg', colour); },
    });
  });
}

function splitWords() {
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((heading) => {
    if (heading.dataset.splitDone) return;
    heading.dataset.splitDone = 'true';
    const mask = heading.dataset.split === 'mask';
    // Keep the accessible name intact: words are visual only.
    heading.setAttribute('aria-label', heading.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    // background-clip:text does not reach inline-block children, so gradient words carry the class themselves.
    const wrap = (node: Node, gradient = false): Node[] => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? '').split(/(\s+)/).filter(Boolean).map((part) => {
          if (/^\s+$/.test(part)) return document.createTextNode(part);
          const outer = document.createElement('span');
          outer.className = mask ? 'word-mask' : 'inline-block';
          outer.setAttribute('aria-hidden', 'true');
          const inner = document.createElement('span');
          inner.className = gradient ? 'word inline-block gradient-text' : 'word inline-block';
          inner.textContent = part;
          outer.append(inner);
          return outer;
        });
      }
      if (node instanceof HTMLElement) {
        const clone = node.cloneNode(false) as HTMLElement;
        const isGradient = gradient || clone.classList.contains('gradient-text');
        clone.classList.remove('gradient-text');
        node.childNodes.forEach((child) => clone.append(...wrap(child, isGradient)));
        return [clone];
      }
      return [node.cloneNode(true)];
    };
    const parts = Array.from(heading.childNodes).flatMap((child) => wrap(child));
    heading.replaceChildren(...parts);
  });
}

function countUp(el: HTMLElement) {
  const text = el.textContent ?? '';
  const match = text.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!match) return;
  const target = Number(match[1].replace(/,/g, ''));
  const [before, after] = [text.slice(0, match.index), text.slice((match.index ?? 0) + match[1].length)];
  const grouped = match[1].includes(',');
  const state = { n: 0 };
  el.setAttribute('aria-label', text);
  gsap.to(state, {
    n: target,
    duration: 1.6,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    onUpdate: () => {
      const n = Math.round(state.n);
      el.textContent = before + (grouped ? n.toLocaleString('en-US') : String(n)) + after;
    },
  });
}

// Cards lean toward the pointer and a soft highlight follows it across the surface.
function tilt(card: HTMLElement) {
  const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
  const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
  gsap.set(card, { transformPerspective: 900 });
  const glare = document.createElement('span');
  glare.className = 'glare';
  glare.setAttribute('aria-hidden', 'true');
  card.append(glare);
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    ry((px - 0.5) * 7);
    rx(-(py - 0.5) * 7);
    glare.style.setProperty('--gx', `${px * 100}%`);
    glare.style.setProperty('--gy', `${py * 100}%`);
  });
  card.addEventListener('pointerleave', () => { rx(0); ry(0); });
}

// Buttons drift a few pixels toward the pointer, then settle back.
function magnetic(btn: HTMLElement) {
  const x = gsap.quickTo(btn, 'x', { duration: 0.45, ease: 'power3' });
  const y = gsap.quickTo(btn, 'y', { duration: 0.45, ease: 'power3' });
  const clamp = (v: number) => Math.max(-6, Math.min(6, v));
  btn.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect();
    x(clamp((e.clientX - r.left - r.width / 2) * 0.12));
    y(clamp((e.clientY - r.top - r.height / 2) * 0.25));
  });
  btn.addEventListener('pointerleave', () => { x(0); y(0); });
}

root.dataset.motion = 'ready';

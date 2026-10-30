// Smooth scroll and scroll-driven UI animation for every page except /cv.
// Markup opts in with data attributes so pages stay plain HTML:
//   data-reveal      fade and rise into view
//   data-split       split a heading into words that pop in
//   data-count       count the first number in the text up from zero
//   data-parallax=n  drift at n × scroll speed
//   data-draw        grow a line from 0 to full height while scrolling past
//   data-tilt        tilt toward the pointer on hover (fine pointers only)
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const mm = gsap.matchMedia();

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

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.fromTo(els,
      { opacity: 0, y: 36, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.6)', stagger: 0.09, overwrite: true }),
  });

  gsap.utils.toArray<HTMLElement>('[data-split] .word').forEach((word, i) => {
    // No opacity fade: the heading is the LCP element and must paint immediately.
    gsap.from(word, { yPercent: 45, rotate: 6, duration: 0.9, delay: 0.05 + i * 0.08, ease: 'back.out(2.2)' });
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
  }

  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
});

function splitWords() {
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((heading) => {
    if (heading.dataset.splitDone) return;
    heading.dataset.splitDone = 'true';
    // Keep the accessible name intact: words are visual only.
    heading.setAttribute('aria-label', heading.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    // background-clip:text does not reach inline-block children, so gradient words carry the class themselves.
    const wrap = (node: Node, gradient = false): Node[] => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? '').split(/(\s+)/).filter(Boolean).map((part) => {
          if (/^\s+$/.test(part)) return document.createTextNode(part);
          const outer = document.createElement('span');
          outer.className = 'inline-block';
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

function tilt(card: HTMLElement) {
  const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
  const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
  gsap.set(card, { transformPerspective: 900 });
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    ry(((e.clientX - r.left) / r.width - 0.5) * 8);
    rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
  });
  card.addEventListener('pointerleave', () => { rx(0); ry(0); });
}

root.dataset.motion = 'ready';

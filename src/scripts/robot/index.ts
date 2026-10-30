// Mounts Byte into the hero slot. On wide screens Byte then flies to the corner and
// keeps you company, switching pose and speech bubble for each section.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createStage } from './scene';
import { buildRobot } from './robot';
import { createBehaviors, type Pose } from './behaviors';

gsap.registerPlugin(ScrollTrigger);

const sections: Record<string, { pose: Pose; say: string }> = {
  hero: { pose: 'hello', say: "Hi! I'm Byte 👋" },
  work: { pose: 'work', say: 'Ooh, shiny releases ✨' },
  toolkit: { pose: 'type', say: 'Tap tap tap… ⌨️' },
  log: { pose: 'rocket', say: 'So much shipping 🚀' },
  about: { pose: 'think', say: 'Physics → code 🧪' },
  contact: { pose: 'wave', say: 'Say hi to Nevalen! 💌' },
};

export function mountRobot(slot: HTMLElement) {
  const poster = slot.querySelector<HTMLElement>('.robot-poster');
  const bubbleWrap = slot.querySelector<HTMLElement>('[data-robot-bubble-wrap]');
  const bubble = slot.querySelector<HTMLElement>('[data-robot-bubble]');
  const wide = matchMedia('(min-width: 1280px)');

  const fly = document.createElement('div');
  fly.className = 'robot-fly';
  fly.setAttribute('aria-hidden', 'true');
  fly.title = 'Click Byte!';
  const canvas = document.createElement('canvas');
  canvas.className = 'size-full';
  fly.append(canvas);
  if (bubbleWrap) fly.append(bubbleWrap);
  slot.append(fly);

  let stage: ReturnType<typeof createStage>;
  try {
    stage = createStage(canvas);
  } catch {
    fly.remove(); // no WebGL after all: the poster stays
    if (bubbleWrap) slot.append(bubbleWrap);
    return;
  }
  const bot = buildRobot();
  stage.scene.add(bot.root);
  const brain = createBehaviors(bot);
  stage.setFrame(brain.update);

  const size = () => {
    const r = slot.getBoundingClientRect();
    fly.style.width = `${r.width}px`;
    fly.style.height = `${r.height}px`;
    stage.resize(r.width, r.height);
  };
  size();

  // Pointer anywhere on the page steers the head.
  addEventListener('pointermove', (e) => {
    const r = fly.getBoundingClientRect();
    brain.lookAt((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2), -(e.clientY - (r.top + r.height / 2)) / (innerHeight / 2));
  }, { passive: true });
  // Phones: tilt the device instead (Android; iOS asks permission, so it just stays idle).
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    brain.lookAt(e.gamma / 35, -(e.beta - 45) / 35);
  }, { passive: true });

  fly.addEventListener('click', () => {
    brain.celebrate();
    if (bubble) {
      bubble.textContent = ['Yay! 💜', 'Hehe, that tickles!', 'Beep boop! 🤖', 'High five! ✋'][Math.floor(Math.random() * 4)];
      gsap.fromTo(bubble, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    }
  });

  const say = (text: string) => {
    if (!bubble || bubble.textContent === text) return;
    gsap.to(bubble, { scale: 0.6, opacity: 0, duration: 0.15, onComplete: () => {
      bubble.textContent = text;
      gsap.to(bubble, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(3)' });
    } });
  };

  // Each section sets a pose while it fills the middle of the screen.
  for (const [id, { pose, say: text }] of Object.entries(sections)) {
    const el = document.querySelector(`[data-section="${id}"]`);
    if (!el) continue;
    ScrollTrigger.create({
      trigger: el, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => { if (self.isActive) { brain.setPose(pose); say(text); } },
    });
  }

  // Wide screens: fixed companion that travels from the hero slot to the corner.
  let flight: gsap.core.Timeline | undefined;
  const layout = () => {
    flight?.scrollTrigger?.kill();
    flight?.kill();
    gsap.set(fly, { clearProps: 'x,y,scale' });
    if (bubbleWrap) gsap.set(bubbleWrap, { clearProps: 'scale' });
    size();
    if (!wide.matches) {
      fly.classList.remove('robot-fly--fixed');
      return;
    }
    const hero = document.querySelector('[data-section="hero"]');
    const home = slot.getBoundingClientRect();
    const top = home.top + scrollY;
    fly.classList.add('robot-fly--fixed');
    fly.style.left = `${home.left}px`;
    fly.style.top = `${top}px`;
    const scale = 0.34;
    flight = gsap.timeline({
      defaults: { ease: 'power1.inOut' },
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 35%', scrub: 0.8, invalidateOnRefresh: true },
    });
    flight.to(fly, {
      x: () => innerWidth - home.width * scale - 24 - home.left,
      y: () => innerHeight - home.height * scale - 24 - top,
      scale,
      transformOrigin: '0 0',
    }, 0);
    // Counter-scale the bubble so it stays readable when Byte is small.
    if (bubbleWrap) flight.to(bubbleWrap, { scale: 0.9 / scale }, 0);
  };
  layout();
  wide.addEventListener('change', () => { layout(); ScrollTrigger.refresh(); });
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { layout(); ScrollTrigger.refresh(); }, 150);
  });

  // Only render while Byte is visible and the tab is in front.
  let onScreen = true;
  const sync = () => (onScreen && !document.hidden ? stage.start() : stage.stop());
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); }).observe(fly);
  document.addEventListener('visibilitychange', sync);
  sync();

  requestAnimationFrame(() => {
    fly.classList.add('robot-fly--ready');
    if (poster) poster.style.opacity = '0';
  });
}

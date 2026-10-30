// Mounts Byte into the hero slot. On wide screens Byte then flies to the corner and
// keeps you company, switching pose and speech bubble for each section.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createStage } from './scene';
import { buildRobot } from './robot';
import { createBehaviors, type Pose } from './behaviors';

gsap.registerPlugin(ScrollTrigger);

// Pose, line and rim-light colour for each section (the rim matches the section's wash).
const sections: Record<string, { pose: Pose; say: string; rim: string }> = {
  hero: { pose: 'hello', say: "Hi! I'm Byte 👋", rim: '#5bc0ff' },
  work: { pose: 'work', say: 'Recent releases', rim: '#ffd84a' },
  toolkit: { pose: 'type', say: 'Daily toolkit', rim: '#5bc0ff' },
  log: { pose: 'rocket', say: 'Career so far', rim: '#ff8a7a' },
  about: { pose: 'think', say: 'Physics → backend', rim: '#b69cff' },
  contact: { pose: 'wave', say: 'Let’s talk 👋', rim: '#3ddc97' },
};

export function mountRobot(slot: HTMLElement) {
  const poster = slot.querySelector<HTMLElement>('.robot-poster');
  const bubbleWrap = slot.querySelector<HTMLElement>('[data-robot-bubble-wrap]');
  const bubble = slot.querySelector<HTMLElement>('[data-robot-bubble]');
  const wide = matchMedia('(min-width: 1280px)');
  let booted = false; // section lines wait until Byte has finished booting

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
  const brain = createBehaviors(bot, stage);
  stage.setFrame(brain.update);
  // Dev only (stripped from production): lets scripts/render-poster.mjs pose and photograph Byte.
  if (import.meta.env.DEV) {
    (window as unknown as { __byte: unknown }).__byte = {
      stage, bot, brain,
      /** Render one settled frame at full quality and return it as a transparent PNG data URL. */
      snapshot(size = 1920, pose: Pose = 'hello') {
        const r = stage.renderer;
        stage.stop();
        r.shadowMap.enabled = true;
        stage.key.castShadow = true;
        stage.scene.traverse((o) => { const m = (o as { material?: { needsUpdate: boolean } }).material; if (m) m.needsUpdate = true; });
        brain.settle(pose);
        brain.lookAt(-0.2, 0.08);
        for (let i = 0; i < 240; i++) brain.update(1 / 60);
        const dpr = r.getPixelRatio();
        const w = r.domElement.clientWidth, h = r.domElement.clientHeight;
        r.setPixelRatio(1);
        stage.resize(size, size);
        r.render(stage.scene, stage.camera);
        const url = r.domElement.toDataURL('image/png');
        r.setPixelRatio(dpr);
        stage.resize(w, h);
        stage.start();
        return url;
      },
    };
  }

  // The bubble waits for Byte to finish booting, then pops in.
  if (bubble) gsap.set(bubble, { scale: 0.6, opacity: 0 });
  const popBubble = () => { if (bubble) gsap.to(bubble, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)' }); };

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

  fly.addEventListener('pointerenter', () => brain.setHover(true));
  fly.addEventListener('pointerleave', () => brain.setHover(false));
  fly.addEventListener('click', () => {
    brain.celebrate();
    if (bubble) {
      bubble.textContent = ['Hello!', 'Beep boop 🤖', 'Nice to meet you', 'High five ✋'][Math.floor(Math.random() * 4)];
      gsap.fromTo(bubble, { scale: 0.7 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)' });
    }
  });

  const say = (text: string) => {
    if (!bubble || bubble.textContent === text) return;
    gsap.to(bubble, { scale: 0.6, opacity: 0, duration: 0.15, onComplete: () => {
      bubble.textContent = text;
      gsap.to(bubble, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)' });
    } });
  };

  // Each section sets a pose while it fills the middle of the screen.
  for (const [id, { pose, say: text, rim }] of Object.entries(sections)) {
    const el = document.querySelector(`[data-section="${id}"]`);
    if (!el) continue;
    ScrollTrigger.create({
      trigger: el, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => { if (self.isActive) { brain.setPose(pose); stage.setRim(rim); if (booted) say(text); } },
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
    gsap.set(fly, { transformOrigin: '0 0' });
    flight = gsap.timeline({
      scrollTrigger: {
        trigger: hero, start: 'top top', end: 'bottom 35%', scrub: 0.8, invalidateOnRefresh: true,
        // Bank into the turn and fire the jet harder while Byte is travelling.
        onUpdate: (self) => brain.setTravel(self.getVelocity()),
        onScrubComplete: () => brain.setTravel(0),
      },
    });
    // Different easings on x and y bend the straight line into an arc.
    flight.to(fly, { x: () => innerWidth - home.width * scale - 24 - home.left, ease: 'power2.inOut' }, 0);
    flight.to(fly, { y: () => innerHeight - home.height * scale - 24 - top, ease: 'power3.in' }, 0);
    flight.to(fly, { scale, ease: 'power1.inOut' }, 0);
    // Counter-scale the bubble so it stays readable when Byte is small.
    if (bubbleWrap) flight.to(bubbleWrap, { scale: 0.9 / scale, ease: 'power1.inOut' }, 0);
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

  // Crossfade from the poster once the first frame is on screen, then boot up.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fly.classList.add('robot-fly--ready');
    if (poster) poster.style.opacity = '0';
    brain.boot(() => { booted = true; popBubble(); });
  }));
}

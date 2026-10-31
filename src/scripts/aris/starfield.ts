// The starfield behind every page: three depths of twinkling stars that drift with scroll, a
// shooting star now and then, and warp (stars stretch into streaks) while ARIS-1 changes mode.
// Plain 2D canvas, so it never waits for Three.js. Pages ask for warp with an `aris:warp` event.

type Star = { x: number; y: number; z: number; r: number; tw: number; ph: number; c: string };
type Meteor = { x: number; y: number; vx: number; vy: number; life: number };

const colours = ['#ffffff', '#dbe9ff', '#bcd7ff', '#9ff7ec', '#ffe2b0'];

export function startStarfield(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0;
  let stars: Star[] = [];
  let meteor: Meteor | null = null;
  let nextMeteor = 4 + Math.random() * 6;
  let warp = 0, warpTo = 0;
  let lastScroll = scrollY;
  let frame = 0, last = 0, clock = 0;

  const resize = () => {
    // Stars are single dots, so 1.5x is plenty and keeps the full-screen canvas cheap on big displays.
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(640, Math.max(120, (w * h) / 2400)));
    // Most stars are far away (small z): squaring the random number skews them that way.
    stars = Array.from({ length: count }, () => {
      const z = Math.random() ** 2;
      return {
        x: Math.random() * w, y: Math.random() * h, z,
        r: 0.35 + z * 1.25 + (Math.random() < 0.03 ? 0.8 : 0),
        tw: 0.6 + Math.random() * 2.2, ph: Math.random() * Math.PI * 2,
        c: colours[Math.random() < 0.82 ? Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2)],
      };
    });
  };

  const draw = (dt: number) => {
    clock += dt;
    warp += (warpTo - warp) * (1 - Math.exp(-dt * 4));
    const scrolled = scrollY - lastScroll;
    lastScroll = scrollY;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;

    for (const s of stars) {
      // Parallax: near stars slide further than far ones when the page scrolls.
      s.y -= scrolled * (0.04 + s.z * 0.22);
      s.y += dt * (1.5 + s.z * 6);
      if (warp > 0.01) {
        // Warp: every star rushes away from the centre of the screen.
        const dx = s.x - cx, dy = s.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        const v = warp * (60 + s.z * 900) * dt * (0.4 + d / Math.max(w, h));
        s.x += (dx / d) * v;
        s.y += (dy / d) * v;
        if (s.x < -20 || s.x > w + 20 || s.y < -20 || s.y > h + 20) {
          // Respawn near the centre so the tunnel keeps flowing.
          s.x = cx + (Math.random() - 0.5) * w * 0.3;
          s.y = cy + (Math.random() - 0.5) * h * 0.3;
        }
      }
      if (s.y < -4) s.y += h + 8;
      if (s.y > h + 4) s.y -= h + 8;
      const a = still ? 0.8 : 0.55 + 0.45 * Math.sin(clock * s.tw + s.ph);
      ctx.globalAlpha = Math.max(0.08, a) * (0.45 + s.z * 0.55);
      ctx.fillStyle = s.c;
      if (warp > 0.05) {
        const dx = s.x - cx, dy = s.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        const len = warp * (4 + s.z * 70) * (d / Math.max(w, h));
        ctx.strokeStyle = s.c;
        ctx.lineWidth = s.r;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - (dx / d) * len, s.y - (dy / d) * len);
        ctx.stroke();
      } else if (s.r > 1.2) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      }
    }

    // A shooting star every few seconds, never during warp.
    nextMeteor -= dt;
    if (!meteor && nextMeteor <= 0 && warp < 0.05 && !still) {
      const fromLeft = Math.random() < 0.5;
      meteor = { x: fromLeft ? Math.random() * w * 0.5 : w * (0.5 + Math.random() * 0.5), y: Math.random() * h * 0.4, vx: (fromLeft ? 1 : -1) * (500 + Math.random() * 300), vy: 220 + Math.random() * 160, life: 1 };
      nextMeteor = 7 + Math.random() * 9;
    }
    if (meteor) {
      meteor.life -= dt * 1.3;
      meteor.x += meteor.vx * dt;
      meteor.y += meteor.vy * dt;
      const tail = 0.12;
      const grad = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.vx * tail, meteor.y - meteor.vy * tail);
      grad.addColorStop(0, 'rgba(220,255,250,0.9)');
      grad.addColorStop(1, 'rgba(220,255,250,0)');
      ctx.globalAlpha = Math.max(0, Math.sin(meteor.life * Math.PI));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(meteor.x, meteor.y);
      ctx.lineTo(meteor.x - meteor.vx * tail, meteor.y - meteor.vy * tail);
      ctx.stroke();
      if (meteor.life <= 0) meteor = null;
    }
    ctx.globalAlpha = 1;
  };

  const loop = (time: number) => {
    const dt = last ? Math.min((time - last) / 1000, 1 / 20) : 1 / 60;
    last = time;
    draw(dt);
    frame = requestAnimationFrame(loop);
  };
  const start = () => { if (!frame) { last = 0; frame = requestAnimationFrame(loop); } };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };

  resize();
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { resize(); if (still) draw(0); }, 120);
  });
  document.addEventListener('aris:warp', (e) => { warpTo = Number((e as CustomEvent<number>).detail) || 0; });

  if (still) {
    // Reduced motion: one still frame, redrawn only when the window changes size.
    draw(0);
    return;
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
}

const canvas = document.querySelector<HTMLCanvasElement>('[data-starfield]');
if (canvas) startStarfield(canvas);

// ARIS-1's 3D layer. The robot renders into a fixed canvas box that starts in the hero slot and
// flies around the page: to the card being inspected, to a corner dock while you read, or across
// the whole screen in solar flight mode. The laser scanner is an SVG overlay drawn from the visor.
import { PerspectiveCamera, Vector3 } from 'three';
import type { Part, Waypoint } from '../../../data/site';
import { waypoints } from '../../../data/site';
import type { Aris, ArisEvents, Telemetry } from '../types';
import { createBrain, Spring } from './behaviors';
import { buildRobot } from './robot';
import { buildSolar, type Solar } from './solar';
import { createStage } from './stage';

const NS = 'http://www.w3.org/2000/svg';
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Camera shots inside the box for each inspection: where the camera sits and what it looks at.
const shots: Record<Part | 'none', { pos: [number, number, number]; look: [number, number, number] }> = {
  none: { pos: [0, 0.05, 12], look: [0, -0.05, 0] },
  visor: { pos: [0.2, 1.62, 4.6], look: [0, 1.5, 0] },
  reactor: { pos: [0.3, 0.75, 5.8], look: [0, 0.6, 0] },
  manipulator: { pos: [-1.6, 0.2, 6.2], look: [-0.9, 0.05, 0.6] },
  thruster: { pos: [0.6, 0.35, 8.6], look: [0, 0.05, 0] },
};

function createBeam() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'aris-beam');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs><linearGradient id="aris-fan" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3ff3dc" stop-opacity=".5"/><stop offset="1" stop-color="#3ff3dc" stop-opacity=".03"/></linearGradient></defs>
    <polygon data-fan fill="url(#aris-fan)"/>
    <line data-glow stroke="#3ff3dc" stroke-width="7" stroke-linecap="round" opacity=".22"/>
    <line data-core stroke="#e6fffb" stroke-width="1.6" stroke-linecap="round"/>
    <line data-sweep stroke="#3ff3dc" stroke-width="2"/>
    <circle data-ring r="9" fill="none" stroke="#3ff3dc" stroke-width="1.5"/>
    <circle data-dot r="3.5" fill="#e6fffb"/>`;
  const q = <T extends Element>(name: string) => svg.querySelector(`[data-${name}]`) as T;
  const fan = q<SVGPolygonElement>('fan'), glowLine = q<SVGLineElement>('glow'), core = q<SVGLineElement>('core');
  const sweep = q<SVGLineElement>('sweep'), ring = q<SVGCircleElement>('ring'), dot = q<SVGCircleElement>('dot');
  const grad = svg.querySelector('linearGradient')!;
  const line = (el: SVGLineElement, x1: number, y1: number, x2: number, y2: number) => {
    el.setAttribute('x1', x1.toFixed(1)); el.setAttribute('y1', y1.toFixed(1));
    el.setAttribute('x2', x2.toFixed(1)); el.setAttribute('y2', y2.toFixed(1));
  };
  svg.style.opacity = '0';
  let shown = false;
  return {
    svg,
    hide() { if (shown) { shown = false; svg.style.opacity = '0'; } },
    draw(eye: { x: number; y: number }, r: DOMRect, t: number, level: number) {
      shown = true;
      svg.style.opacity = level.toFixed(3);
      // The sweep line runs down and up the card; the beam's hot spot slides along it.
      const p = 0.5 - 0.5 * Math.cos(t * 2.6);
      const y = r.top + 8 + (r.height - 16) * p;
      const x = r.left + 10 + (r.width - 20) * (0.5 + 0.45 * Math.sin(t * 5.3));
      fan.setAttribute('points', `${eye.x.toFixed(1)},${eye.y.toFixed(1)} ${(r.left + 6).toFixed(1)},${y.toFixed(1)} ${(r.right - 6).toFixed(1)},${y.toFixed(1)}`);
      grad.setAttribute('x1', eye.x.toFixed(1)); grad.setAttribute('y1', eye.y.toFixed(1));
      grad.setAttribute('x2', x.toFixed(1)); grad.setAttribute('y2', y.toFixed(1));
      line(glowLine, eye.x, eye.y, x, y);
      line(core, eye.x, eye.y, x, y);
      line(sweep, r.left + 6, y, r.right - 6, y);
      ring.setAttribute('cx', x.toFixed(1)); ring.setAttribute('cy', y.toFixed(1));
      ring.setAttribute('r', (7 + Math.sin(t * 14) * 2.5).toFixed(1));
      dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', y.toFixed(1));
    },
  };
}

export function mountAris(slot: HTMLElement, telemetry: Telemetry, events: ArisEvents): Aris | null {
  const poster = slot.querySelector<HTMLElement>('[data-aris-poster]');
  const fly = document.createElement('div');
  fly.className = 'aris-fly';
  fly.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  fly.append(canvas);
  document.body.append(fly);

  let stage: ReturnType<typeof createStage>;
  try {
    // ?aris=3d forces the 3D robot even on a software renderer (for testing); dev mode always does.
    stage = createStage(canvas, { allowSoftware: import.meta.env.DEV || new URLSearchParams(location.search).get('aris') === '3d' });
  } catch {
    fly.remove(); // no WebGL, or only a software renderer: the poster stays
    return null;
  }
  const bot = buildRobot();
  stage.scene.add(bot.root);
  const brain = createBrain(bot);
  const beam = createBeam();
  document.body.append(beam.svg);
  const callout = document.createElement('p');
  callout.className = 'aris-callout';
  callout.setAttribute('aria-hidden', 'true');
  document.body.append(callout);
  // The robot sits above the page, so a hit area follows it; behind it the page stays clickable.
  const hit = document.createElement('button');
  hit.type = 'button';
  hit.className = 'aris-hit';
  hit.tabIndex = -1;
  hit.setAttribute('aria-hidden', 'true');
  hit.title = 'Say hello to ARIS-1';
  document.body.append(hit);
  hit.addEventListener('click', () => { brain.spin(); brain.wave(1.6); events.onPoke(); });

  // ---- box layout: the renderer is sized to the hero slot; elsewhere the box is scaled
  let W = 1, H = 1;
  const measure = () => {
    const r = slot.getBoundingClientRect();
    W = Math.max(120, r.width);
    H = Math.max(140, r.height);
    fly.style.width = `${W}px`;
    fly.style.height = `${H}px`;
    if (!solar?.group.visible) stage.resize(W, H);
  };

  const px = new Spring(0, 16), py = new Spring(0, 16), ps = new Spring(1, 18);
  let attached = true; // riding exactly on the hero slot
  let away = false;
  let target: HTMLElement | null = null;
  let scanEl: HTMLElement | null = null;
  let scanUntil = 0;
  let shot: Part | 'none' = 'none';
  let calloutUntil = 0;
  const beamLevel = new Spring(0, 90);
  const camPos = new Vector3(...shots.none.pos), camLook = new Vector3(...shots.none.look);
  const goalPos = new Vector3(), goalLook = new Vector3();
  const pointer = { x: innerWidth * 0.3, y: innerHeight * 0.4 };
  addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });

  const header = () => (innerWidth < 640 ? 70 : 82);
  // On narrow screens an idle ARIS-1 peeks up from the bottom edge, half hidden, so it does not
  // sit on the text you are reading; it rises fully when it has something to do.
  const corner = (peek = false) => {
    const narrow = innerWidth < 640;
    const h = Math.min(narrow ? 128 : 172, innerHeight * 0.26);
    const s = h / H;
    return { x: innerWidth - W * s - 6, y: innerHeight - H * s * (peek && narrow ? 0.52 : 1) - 8, s, slot: false };
  };
  const dock = () => {
    const r = slot.getBoundingClientRect();
    if (r.bottom > innerHeight * 0.38 && r.top < innerHeight * 0.75) return { x: r.left, y: r.top, s: r.width / W, slot: true };
    return corner(!calloutUntil && shot === 'none');
  };
  // Next to a card, ARIS-1 hovers in the page margin on the card's side and fires across, so it
  // never covers the text. Where the margins are too narrow (tablets, phones) it scans from the corner.
  let zone: { for: HTMLElement; el: HTMLElement; pad: number } | null = null;
  const beside = (el: HTMLElement) => {
    if (zone?.for !== el) {
      const container = el.closest<HTMLElement>('.max-w-6xl') ?? document.body;
      zone = { for: el, el: container, pad: parseFloat(getComputedStyle(container).paddingLeft) || 0 };
    }
    const r = el.getBoundingClientRect();
    const c = zone.el.getBoundingClientRect();
    const left = c.left + zone.pad, right = c.right - zone.pad;
    const h = Math.min(230, innerHeight * 0.3);
    const s = h / H, bw = W * s, bh = H * s;
    const room = [left, innerWidth - right];
    const prefer = r.left + r.width / 2 < (left + right) / 2 ? 0 : 1;
    const side = room[prefer] >= bw * 0.7 ? prefer : room[1 - prefer] >= bw * 0.7 ? 1 - prefer : -1;
    if (side < 0) return corner();
    const y = clamp(r.top + Math.min(r.height, innerHeight) * 0.35 - bh / 2, header(), innerHeight - bh - 8);
    const x = side === 0 ? left - bw * 0.9 : right - bw * 0.1;
    return { x: clamp(x, 4, innerWidth - bw - 4), y, s, slot: false };
  };

  // Projects a point on the robot to page pixels.
  const v = new Vector3();
  const eyeLocal = new Vector3(0, 0.51, 0.34), headLocal = new Vector3(0, 0.5, 0.2), chestLocal = new Vector3(0, 0.3, 0);
  const toScreen = (obj: { localToWorld(v: Vector3): Vector3 }, local: Vector3) => {
    v.copy(local);
    obj.localToWorld(v);
    v.project(stage.camera);
    const s = ps.x;
    return { x: px.x + ((v.x + 1) / 2) * W * s, y: py.x + ((1 - v.y) / 2) * H * s };
  };

  // ---- solar flight mode (built on first use)
  let solar: Solar | undefined;
  let solarCam: PerspectiveCamera | undefined;
  let unbind: (() => void) | undefined;
  let tags = new Map<Waypoint, HTMLButtonElement>();
  let destination: Waypoint = 'earth';
  let wasTravelling = false;

  let clock = 0;
  const frame = (dt: number) => {
    clock += dt;
    if (solar?.group.visible) return solarFrame(dt);

    // Where the box wants to be: next to the card, else the dock.
    const goal = target ? beside(target) : dock();
    const homeSlot = !target && goal.slot;
    if (homeSlot && attached) {
      px.x = goal.x; py.x = goal.y; ps.x = goal.s; px.v = py.v = ps.v = 0;
    } else {
      px.step(goal.x, dt); py.step(goal.y, dt); ps.step(goal.s, dt);
      attached = homeSlot && Math.abs(px.x - goal.x) < 3 && Math.abs(py.x - goal.y) < 3 && Math.abs(ps.x - goal.s) < 0.01;
    }
    fly.style.transform = `translate3d(${px.x.toFixed(2)}px, ${py.x.toFixed(2)}px, 0) scale(${ps.x.toFixed(4)})`;
    // Scrolling moves the attached box with the page; it is not travel.
    brain.setTravel(attached ? 0 : px.v, attached ? 0 : py.v);

    // Camera shot for inspections.
    const sh = shots[shot];
    goalPos.set(...sh.pos); goalLook.set(...sh.look);
    const k = 1 - Math.exp(-dt * 3.2);
    camPos.lerp(goalPos, k); camLook.lerp(goalLook, k);
    stage.camera.position.copy(camPos);
    stage.camera.lookAt(camLook);
    stage.camera.updateMatrixWorld();

    // Look at the card being scanned, else at the pointer.
    bot.root.updateMatrixWorld(true);
    const head = toScreen(bot.head, headLocal);
    const focusRect = (scanEl ?? target)?.getBoundingClientRect();
    const fx = focusRect ? focusRect.left + focusRect.width / 2 : pointer.x;
    const fy = focusRect ? focusRect.top + focusRect.height / 2 : pointer.y;
    if (shot === 'none') brain.setLook(Math.atan2(fx - head.x, 650), Math.atan2(-(fy - head.y), 650));
    else brain.setLook(0, 0);
    // Docked, ARIS-1 turns a little toward the page, so it reads in three quarters rather than flat.
    brain.setFacing(focusRect ? clamp((fx - head.x) / 700, -0.75, 0.75) : -0.32);

    brain.update(dt);
    bot.root.updateMatrixWorld(true);

    // The scanner fires once ARIS-1 has arrived next to the card.
    const now = performance.now();
    if (scanEl && now > scanUntil) scanEl = null;
    const arrived = Math.hypot(px.v, py.v) < 260;
    const scanRect = scanEl?.getBoundingClientRect();
    const onScreen = scanRect && scanRect.bottom > 0 && scanRect.top < innerHeight;
    const level = beamLevel.step(scanEl && arrived && onScreen ? 1 : 0, dt);
    if (scanRect && level > 0.01) beam.draw(toScreen(bot.head, eyeLocal), scanRect, clock, level);
    else beam.hide();
    brain.setPose(shot !== 'none' ? shot : scanEl && arrived ? 'scan' : 'idle');
    if (away !== !attached) { away = !attached; slot.toggleAttribute('data-away', away); }

    // Callout next to the visor, flipped to the left near the right edge.
    if (calloutUntil && now > calloutUntil) { callout.removeAttribute('data-show'); calloutUntil = 0; }
    if (calloutUntil) {
      const cw = callout.offsetWidth, ch = callout.offsetHeight;
      const right = head.x + W * ps.x * 0.16;
      const x = right + cw > innerWidth - 8 ? head.x - W * ps.x * 0.16 - cw : right;
      callout.style.transform = `translate3d(${clamp(x, 8, innerWidth - cw - 8).toFixed(1)}px, ${clamp(head.y - ch - 12, header(), innerHeight - ch - 8).toFixed(1)}px, 0)`;
    }

    // Hit area over the body, only while docked.
    const docked = !target && Math.hypot(px.v, py.v) < 40;
    hit.style.pointerEvents = docked ? 'auto' : 'none';
    if (docked) {
      const c = toScreen(bot.torso, chestLocal);
      const hw = W * ps.x * 0.5, hh = H * ps.x * 0.72;
      hit.style.width = `${hw}px`;
      hit.style.height = `${hh}px`;
      hit.style.transform = `translate3d(${(c.x - hw / 2).toFixed(1)}px, ${(c.y - hh / 2).toFixed(1)}px, 0)`;
    }

    telemetry.x = Math.round(px.x + (W * ps.x) / 2 - innerWidth / 2);
    telemetry.y = Math.round(innerHeight / 2 - (py.x + (H * ps.x) / 2));
    telemetry.thrust = brain.thrust;
    telemetry.fps = stage.fps;
  };

  const solarFrame = (dt: number) => {
    const s = solar!;
    s.update(dt, bot.root);
    brain.setCruise(s.cruise);
    brain.update(dt);
    if (s.travelling !== wasTravelling) {
      wasTravelling = s.travelling;
      if (s.travelling) events.onDepart(s.target);
    }
    destination = s.target;
    const labels = s.labels(innerWidth, innerHeight);
    labels.forEach((l) => {
      const tag = tags.get(l.id)!;
      tag.hidden = !l.visible;
      if (l.visible) tag.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0) translate(-50%, -130%)`;
      tag.toggleAttribute('aria-current', l.id === destination);
    });
    telemetry.x = +s.position.x.toFixed(2);
    telemetry.y = +s.position.z.toFixed(2);
    telemetry.thrust = brain.thrust;
    telemetry.fps = stage.fps;
    telemetry.distance = s.distance;
  };
  stage.setFrame(frame);

  // ---- run only while the tab is in front
  let compiled = false;
  const sync = () => (compiled && !document.hidden ? stage.start() : stage.stop());
  document.addEventListener('visibilitychange', sync);

  measure();
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measure();
      if (solar?.group.visible) stage.resize(innerWidth, innerHeight);
    }, 120);
  });
  // Start where the slot is, so the first frame lines up with the poster.
  const start = dock();
  px.x = start.x; py.x = start.y; ps.x = start.s;

  telemetry.sys = 'BOOTING';
  // Compile the shaders in parallel first, so the page never stalls on them; then crossfade from
  // the poster once the first frame is on screen, and boot up.
  stage.renderer.compileAsync(stage.scene, stage.camera).catch(() => {}).then(() => {
    compiled = true;
    sync();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fly.classList.add('aris-fly--ready');
      if (poster) poster.style.opacity = '0';
      brain.boot(() => { telemetry.sys = 'ONLINE'; api.greet(); });
    }));
  });

  // Dev only (stripped from production): lets scripts/render-poster.mjs pose and photograph ARIS-1.
  if (import.meta.env.DEV) {
    (window as unknown as { __aris: unknown }).__aris = {
      stage, bot, brain, api: () => api,
      /** Advance n frames by hand (a background tab gets no animation frames). */
      step(n = 60, dt = 1 / 60) { for (let i = 0; i < n; i++) frame(dt); stage.render(); },
      /** Render one settled frame at full quality and return it as a transparent PNG data URL. */
      snapshot(width = 1000, height = 1200) {
        const r = stage.renderer;
        stage.stop();
        r.shadowMap.enabled = true;
        stage.key.castShadow = true;
        stage.scene.traverse((o) => { const m = (o as { material?: { needsUpdate: boolean } }).material; if (m) m.needsUpdate = true; });
        brain.settle();
        // The pose ARIS-1 holds in the hero slot, so the poster and the live robot line up.
        brain.setLook(-0.45, 0.06);
        brain.setFacing(-0.32);
        stage.camera.position.set(...shots.none.pos);
        stage.camera.lookAt(...shots.none.look);
        for (let i = 0; i < 240; i++) brain.update(1 / 60);
        const dpr = r.getPixelRatio();
        r.setPixelRatio(1);
        stage.resize(width, height);
        r.render(stage.scene, stage.camera);
        const url = r.domElement.toDataURL('image/png');
        r.setPixelRatio(dpr);
        stage.resize(W, H);
        stage.start();
        return url;
      },
    };
  }

  async function enterSolar() {
    if (!solar) {
      solar = await buildSolar();
      stage.scene.add(solar.group);
      solarCam = solar.camera;
      solar.onArrive = (id) => events.onArrive(id);
      solar.onPick = (id) => api.flyTo(id);
      tags = new Map(waypoints.map((w) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'planet-tag';
        b.textContent = w.name;
        b.hidden = true;
        b.addEventListener('click', () => api.flyTo(w.id));
        return [w.id, b] as const;
      }));
    }
    target = null;
    scanEl = null;
    shot = 'none';
    beam.hide();
    callout.removeAttribute('data-show');
    hit.style.pointerEvents = 'none';
    fly.classList.add('aris-fly--full');
    solar.reset();
    solar.group.visible = true;
    bot.root.scale.setScalar(0.18);
    bot.root.position.copy(solar.position);
    brain.setLook(0, 0);
    brain.setFacing(0);
    brain.setPose('idle');
    stage.sun.intensity = 2.6;
    stage.key.intensity = 0.25;
    stage.key.castShadow = false;
    stage.scene.environmentIntensity = 0.3;
    stage.use(solarCam);
    stage.resize(innerWidth, innerHeight);
    document.body.append(...tags.values());
    unbind = solar.bind(fly);
    wasTravelling = false;
    destination = solar.target;
  }

  async function exitSolar() {
    if (!solar) return;
    unbind?.();
    tags.forEach((t) => t.remove());
    solar.group.visible = false;
    fly.classList.remove('aris-fly--full');
    bot.root.position.set(0, 0, 0);
    bot.root.quaternion.identity();
    bot.root.scale.setScalar(1);
    brain.setCruise(-1);
    stage.sun.intensity = 0;
    stage.key.intensity = 2.8;
    stage.key.castShadow = stage.renderer.shadowMap.enabled;
    stage.scene.environmentIntensity = 0.55;
    stage.use(stage.camera);
    measure();
    // Reappear at the dock rather than flying in from wherever the solar camera left it.
    const d = dock();
    px.x = d.x; py.x = d.y; ps.x = d.s; px.v = py.v = ps.v = 0;
    attached = d.slot;
  }

  const api: Aris = {
    attend(el) { target = el; if (el) attached = false; },
    scan(el, ms) { target = el; scanEl = el; scanUntil = performance.now() + ms; attached = false; },
    stopScan() { scanEl = null; },
    inspect(part) {
      shot = part ?? 'none';
      if (part) { target = null; scanEl = null; }
    },
    say(text, ms = 3200) {
      callout.textContent = text;
      callout.setAttribute('data-show', '');
      calloutUntil = performance.now() + ms;
    },
    greet() {
      brain.wave(2.6);
      api.say(`ARIS-1 online. ${matchMedia('(hover: hover)').matches ? 'Hover' : 'Tap'} a card and I will scan it.`, 4200);
    },
    enterSolar,
    exitSolar,
    flyTo(id) { solar?.flyTo(id); },
    get destination() { return destination; },
  };
  return api;
}

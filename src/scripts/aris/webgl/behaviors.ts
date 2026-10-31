// Everything ARIS-1 does per frame. Joints run on springs, so every move eases in and settles like
// a body with mass: boot-up, zero-g float, looking around, flight posture, scanning, inspection
// poses, waving, and a spin when someone clicks it.
import type { Part } from '../../../data/site';
import type { Robot } from './robot';

export type Pose = 'idle' | 'scan' | 'fly' | Part;

// Semi-implicit spring. zeta 1 settles without overshoot; below 1 it wobbles a little.
export class Spring {
  v = 0;
  private c: number;
  constructor(public x = 0, private k = 120, zeta = 1) { this.c = 2 * zeta * Math.sqrt(k); }
  step(target: number, dt: number) {
    const n = Math.ceil(dt / (1 / 120));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (this.k * (target - this.x) - this.c * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
  kick(v: number) { this.v += v; }
}

// Joint targets in radians. Shoulders: [swing x, raise z]; elbows and knees bend; hips swing.
// Negative x swings a limb forward (toward the viewer), positive back.
type Limbs = { sL: [number, number]; sR: [number, number]; eL: number; eR: number; hL: number; hR: number; kL: number; kR: number; ank: number; fist: number };
const idle: Limbs = { sL: [0.1, 0.32], sR: [0.02, -0.3], eL: -0.58, eR: -0.46, hL: -0.16, hR: 0.2, kL: 0.46, kR: 0.62, ank: 0.45, fist: 0.5 };
const poses: Record<Pose, Limbs> = {
  idle,
  scan: { ...idle, sL: [-1.25, 0.28], eL: -0.12 },
  fly: { sL: [0.55, 0.32], sR: [0.55, -0.32], eL: -0.25, eR: -0.25, hL: 0.3, hR: 0.42, kL: 0.55, kR: 0.72, ank: 0.6, fist: 1 },
  visor: { ...idle, sL: [0.1, 0.12], sR: [0.1, -0.12] },
  reactor: { ...idle, sL: [0.25, 0.95], sR: [0.25, -0.95], eL: -0.6, eR: -0.6, fist: 0.15 },
  manipulator: { ...idle, sR: [-1.3, -0.12], eR: -0.35 },
  thruster: { sL: [0.4, 0.3], sR: [0.4, -0.3], eL: -0.3, eR: -0.3, hL: 0.22, hR: 0.32, kL: 0.4, kR: 0.5, ank: 0.5, fist: 1 },
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

export function createBrain(bot: Robot) {
  let clock = 0;
  let pose: Pose = 'idle';
  let lookYaw = 0, lookPitch = 0, facing = 0;
  let vx = 0, vy = 0;
  let waveUntil = 0;
  let spinT = -1;
  let thrust = 0;
  let cruise = -1; // solar flight: 0..1 lean and thrust; the caller steers the heading
  let nodT = -1;
  let talking = false;

  const sp = {
    sLx: new Spring(0, 60, 0.8), sLz: new Spring(0, 60, 0.8), sRx: new Spring(0, 60, 0.8), sRz: new Spring(0, 60, 0.8),
    eL: new Spring(0, 70, 0.8), eR: new Spring(0, 70, 0.8), eRz: new Spring(0, 90, 0.6),
    hL: new Spring(0, 40), hR: new Spring(0, 40), kL: new Spring(0, 40), kR: new Spring(0, 40), ank: new Spring(0, 40),
    fist: new Spring(0.5, 80), wrist: new Spring(0, 60), claw: new Spring(0, 120),
    headY: new Spring(0, 80), headX: new Spring(0, 80), headZ: new Spring(0, 60, 0.7),
    yaw: new Spring(0, 22), lean: new Spring(0, 26), roll: new Spring(0, 30),
    lift: new Spring(-0.6, 30, 0.85), eyes: new Spring(0, 200), scan: new Spring(0, 60), reactor: new Spring(0, 40),
  };

  // Boot-up: lights dark and ARIS-1 low; then the visor flickers on and it rises.
  let boot = -1; // -1 waiting; seconds since boot began; -2 done
  let onBooted: (() => void) | undefined;
  let blinkAt = 3, blinkT = -1;
  let fidgetAt = 6, fidget: { kind: 'glance' | 'tilt' | 'claw'; t: number; dir: number } | null = null;

  function update(dt: number) {
    clock += dt;
    const t = clock;

    // ---- boot sequence
    let power = 1;
    let boost = 0;
    if (boot >= 0) {
      boot += dt;
      const b = boot;
      power = b < 0.4 ? 0 : b < 0.5 ? 0.7 : b < 0.58 ? 0.05 : b < 0.72 ? 0.9 : b < 0.78 ? 0.25 : clamp01((b - 0.78) / 0.3);
      boost = b < 1.3 ? 1 : Math.max(0, 1 - (b - 1.3) * 2.5);
      sp.lift.step(b > 0.5 ? 0 : -0.6, dt);
      if (b > 1.4 && onBooted) { const done = onBooted; onBooted = undefined; done(); }
      if (b > 2.2) boot = -2;
    } else if (boot === -1) {
      power = 0;
      sp.lift.step(-0.6, dt);
    } else {
      sp.lift.step(0, dt);
    }

    // ---- blinks: the visor lights dip for a moment every few seconds
    if (t > blinkAt && blinkT < 0) blinkT = 0;
    let lid = 1;
    if (blinkT >= 0) {
      blinkT += dt;
      lid = blinkT < 0.06 ? 1 - blinkT / 0.06 : clamp01((blinkT - 0.06) / 0.1);
      if (blinkT > 0.16) { blinkT = -1; blinkAt = t + 2.5 + Math.random() * 4; }
    }

    // ---- idle fidgets every few seconds
    let gx = 0, gy = 0, tilt = 0, clawTwitch = 0;
    if (!fidget && t > fidgetAt && boot === -2 && pose === 'idle' && Math.abs(vx) + Math.abs(vy) < 30) {
      const kinds = ['glance', 'tilt', 'claw'] as const;
      fidget = { kind: kinds[Math.floor(Math.random() * kinds.length)], t: 0, dir: Math.random() < 0.5 ? -1 : 1 };
    }
    if (fidget) {
      fidget.t += dt;
      const k = Math.sin(clamp01(fidget.t / 1.6) * Math.PI);
      if (fidget.kind === 'glance') { gx = 0.6 * fidget.dir * k; gy = 0.12 * k; }
      if (fidget.kind === 'tilt') tilt = 0.18 * fidget.dir * k;
      if (fidget.kind === 'claw') clawTwitch = k;
      if (fidget.t > 1.6) { fidget = null; fidgetAt = t + 5 + Math.random() * 5; }
    }

    // ---- flight: lean into the move, bank, and turn toward where it is going
    const solar = cruise >= 0;
    const speed = solar ? cruise * 1400 : Math.hypot(vx, vy);
    const travelling = speed > 60;
    const p = poses[travelling && pose === 'idle' ? 'fly' : pose];
    const travelYaw = travelling && !solar ? clamp(vx * 0.0011, -1.1, 1.1) : 0;
    let yawTarget = travelling ? travelYaw : facing;
    if (pose === 'thruster') yawTarget = Math.PI - 0.55;
    if (spinT >= 0) {
      spinT += dt;
      const s = clamp01(spinT / 1.1);
      yawTarget += Math.PI * 2 * (1 - (1 - s) ** 3);
      if (spinT > 1.3) { spinT = -1; sp.yaw.x -= Math.PI * 2; }
    }
    bot.body.rotation.y = sp.yaw.step(yawTarget, dt);
    const leanTarget = solar ? 0.15 + cruise * 0.85 : travelling ? clamp(speed * 0.00055, 0, 0.75) * (vy < -speed * 0.7 ? -0.4 : 1) : pose === 'thruster' ? 0.2 : 0;
    bot.lean.rotation.x = sp.lean.step(leanTarget, dt);
    bot.floater.rotation.z = sp.roll.step(clamp(-vx * 0.00028, -0.35, 0.35) + Math.sin(t * 0.8) * 0.03, dt);

    // ---- float
    bot.floater.position.y = Math.sin(t * 1.4) * 0.08 + sp.lift.x;
    bot.floater.rotation.x = Math.sin(t * 0.7) * 0.025;

    // ---- head: look where asked, relative to the turned body
    const relYaw = clamp(lookYaw + gx - bot.body.rotation.y, -1.05, 1.05);
    bot.head.rotation.y = sp.headY.step(pose === 'thruster' || spinT >= 0 ? 0 : relYaw, dt);
    let nod = 0;
    if (nodT >= 0) { nodT += dt; nod = Math.sin(clamp01(nodT / 0.55) * Math.PI) * 0.28; if (nodT > 0.55) nodT = -1; }
    bot.head.rotation.x = sp.headX.step(clamp(-(lookPitch + gy) - bot.lean.rotation.x * 0.6, -0.5, 0.45) + nod, dt);
    bot.head.rotation.z = sp.headZ.step(tilt + (pose === 'visor' ? Math.sin(t * 1.2) * 0.05 : 0), dt);

    // ---- limbs
    const waving = t < waveUntil;
    const { left: L, right: R } = bot.arms;
    L.shoulder.rotation.x = sp.sLx.step(p.sL[0] + Math.sin(t * 1.1) * 0.03, dt);
    L.shoulder.rotation.z = sp.sLz.step(p.sL[1], dt);
    R.shoulder.rotation.x = sp.sRx.step(waving ? -0.15 : p.sR[0] + Math.sin(t * 1.1 + 1) * 0.03, dt);
    R.shoulder.rotation.z = sp.sRz.step(waving ? -2.55 : p.sR[1], dt);
    L.elbow.rotation.x = sp.eL.step(p.eL, dt);
    R.elbow.rotation.x = sp.eR.step(waving ? -0.15 : p.eR, dt);
    R.elbow.rotation.z = sp.eRz.step(waving ? Math.sin(t * 9) * 0.45 : 0, dt);
    const fist = sp.fist.step(p.fist, dt);
    L.fingers.rotation.x = R.fingers.rotation.x = -fist * 1.1;
    R.wrist.rotation.y = sp.wrist.step(pose === 'manipulator' ? Math.sin(t * 1.6) * 1.2 : 0, dt);
    const open = sp.claw.step(pose === 'manipulator' ? 0.25 + 0.25 * Math.sin(t * 4) : clawTwitch * 0.35, dt);
    R.jaws.forEach((jaw, i) => { jaw.rotation.x = (i ? -1 : 1) * open; });
    const { left: lL, right: lR } = bot.legs;
    lL.hip.rotation.x = sp.hL.step(p.hL + Math.sin(t * 1.3) * 0.04, dt);
    lR.hip.rotation.x = sp.hR.step(p.hR + Math.sin(t * 1.3 + 2) * 0.04, dt);
    lL.knee.rotation.x = sp.kL.step(p.kL, dt);
    lR.knee.rotation.x = sp.kR.step(p.kR, dt);
    lL.ankle.rotation.x = lR.ankle.rotation.x = sp.ank.step(p.ank, dt);

    // ---- lights: visor, scan bar, reactor, battery cells
    const eyes = sp.eyes.step(power * lid * (pose === 'scan' || pose === 'visor' ? 1.45 : 1), dt);
    // While speaking, the visor flickers like a voice meter.
    bot.eyeMat.emissiveIntensity = 1.5 * eyes * (talking ? 0.7 + 0.45 * Math.abs(Math.sin(t * 17) * Math.sin(t * 7.3)) : 1);
    bot.eyeGlows.forEach((g) => { (g.material as { opacity: number }).opacity = 0.5 * eyes; g.scale.setScalar(pose === 'scan' ? 0.42 : 0.32); });
    const bar = sp.scan.step(pose === 'visor' || pose === 'scan' ? 1 : 0, dt);
    (bot.scanBar.material as { opacity: number }).opacity = 0.9 * bar * power;
    bot.scanBar.position.y = 0.47 + Math.sin(t * 5) * 0.075;
    const charge = sp.reactor.step(pose === 'reactor' ? 1 : 0, dt);
    const pulse = 0.5 + 0.5 * Math.sin(t * (2.4 + charge * 5));
    bot.reactor.mat.emissiveIntensity = power * (1 + pulse * 0.45 + charge * 1.6);
    (bot.reactor.glow.material as { opacity: number }).opacity = power * (0.45 + charge * 0.45);
    bot.reactor.glow.scale.setScalar(0.95 + charge * (0.9 + pulse * 0.5));
    bot.reactor.light.intensity = power * charge * (2 + pulse * 2);
    bot.cells.forEach((c, i) => { c.visible = power > 0.5 && Math.floor(t * 3 - i) % 4 !== 0; });

    // ---- thrusters: idle trickle, boosted by flight, boot, spin and the thruster inspection
    thrust = clamp(speed / 1400, 0, 1) * 0.9 + boost * 0.8 + (pose === 'thruster' ? 0.9 : 0) + (spinT >= 0 ? 0.6 : 0) + (pose === 'fly' ? 0.5 : 0);
    const flicker = 0.92 + Math.sin(t * 37) * 0.05 + Math.random() * 0.06;
    for (const th of bot.thrusters) {
      const len = power * (0.18 + Math.min(1.6, thrust) * 0.85) * flicker;
      th.flame.scale.set(0.8 + thrust * 0.25, Math.max(0.01, len), 0.8 + thrust * 0.25);
      th.flame.visible = len > 0.02;
      th.glow.scale.setScalar(0.5 + thrust * 0.9);
      (th.glow.material as { opacity: number }).opacity = power * (0.25 + Math.min(1, thrust) * 0.45);
    }
    bot.thrusterMat.emissiveIntensity = power * (0.8 + thrust * 1.2);
  }

  return {
    update,
    get thrust() { return clamp01(thrust); },
    get pose() { return pose; },
    boot(done?: () => void) { boot = 0; onBooted = done; },
    setPose(next: Pose) {
      if (next !== pose) sp.headZ.kick(next === 'idle' ? 0.6 : -0.9);
      pose = next;
    },
    /** Where to look: yaw and pitch in radians, relative to facing the viewer. */
    setLook(yaw: number, pitch: number) { lookYaw = clamp(yaw, -1.3, 1.3); lookPitch = clamp(pitch, -0.8, 0.8); },
    /** Which way the body turns while hovering in place. */
    setFacing(yaw: number) { facing = clamp(yaw, -1.2, 1.2); },
    /** Screen-space velocity in px/s: drives lean, bank, turn and thrust. */
    setTravel(x: number, y: number) { vx = x; vy = y; },
    /** Solar flight: 0..1 cruise level, or -1 to go back to screen-space travel. */
    setCruise(level: number) { cruise = level; },
    wave(seconds = 2.4) { waveUntil = clock + seconds; },
    spin() { if (spinT < 0) spinT = 0; },
    nod() { if (nodT < 0) nodT = 0; },
    talk(on: boolean) { talking = on; },
    /** Jump straight to a settled idle pose (used for poster renders). */
    settle() {
      boot = -2; sp.lift.x = 0; sp.eyes.x = 1; pose = 'idle'; vx = vy = 0; waveUntil = 0; spinT = -1;
      clock = 0; blinkAt = 99; fidgetAt = 99; fidget = null;
    },
  };
}

export type Brain = ReturnType<typeof createBrain>;

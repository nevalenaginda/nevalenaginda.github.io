// Everything Byte does per frame. Motion runs on springs, so every move eases in and settles
// like a physical toy: boot-up, float, look, blink, idle fidgets, poses, jumps and confetti.
import type { Object3D } from 'three';
import { onGlass, type Robot } from './robot';
import type { Stage } from './scene';

export type Pose = 'hello' | 'work' | 'type' | 'rocket' | 'think' | 'wave';

// Semi-implicit spring. zeta 1 settles without overshoot; below 1 it wobbles a little.
class Spring {
  v = 0;
  constructor(public x = 0, private k = 120, zeta = 1) { this.c = 2 * zeta * Math.sqrt(k); }
  private c: number;
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

type ArmPose = { lx: number; lz: number; rx: number; rz: number; tilt: number };
const poses: Record<Pose, ArmPose> = {
  hello: { lx: 0.1, lz: -0.25, rx: 0, rz: 2.45, tilt: 0.06 },
  work: { lx: -1.3, lz: -0.32, rx: -1.3, rz: 0.32, tilt: 0 },
  type: { lx: -1.05, lz: -0.18, rx: -1.05, rz: 0.18, tilt: -0.04 },
  rocket: { lx: 0, lz: -2.55, rx: 0, rz: 2.55, tilt: 0 },
  think: { lx: 0.1, lz: -0.2, rx: -2.15, rz: -0.85, tilt: 0.16 },
  wave: { lx: 0.1, lz: -0.25, rx: 0, rz: 2.5, tilt: -0.06 },
};

const EYE_ON = 2.6;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function createBehaviors(bot: Robot, stage: Stage) {
  let clock = 0;
  let pose: Pose = 'hello';
  const look = { x: 0, y: 0 };
  let hover = false;
  let travel = 0; // scroll-driven flight speed, for banking and jet boost

  // Springs
  const headY = new Spring(0, 90), headX = new Spring(0, 90), headZ = new Spring(0, 70, 0.7);
  const bodyY = new Spring(0, 50);
  const faceX = new Spring(0, 140), faceY = new Spring(0, 140);
  const eyeX = new Spring(0, 400), eyeY = new Spring(0, 400);
  const armLx = new Spring(0, 70, 0.75), armLz = new Spring(0, 70, 0.75), armRx = new Spring(0, 70, 0.75), armRz = new Spring(0, 70, 0.75);
  const antZ = new Spring(0, 55, 0.18), antX = new Spring(0, 55, 0.18); // loose: the antenna wobbles
  const squash = new Spring(1, 260, 0.45);
  const lift = new Spring(-0.7, 60, 0.8);
  const bank = new Spring(0, 40);
  const eyeOpen = new Spring(1, 300);

  // Face parts keep their spot on the domed glass even when the face slides with the gaze.
  const parts = [...bot.eyes, ...bot.happyEyes, bot.mouth, ...bot.cheeks, ...bot.eyeGlows].map((m: Object3D) => ({
    m, bx: m.position.x, by: m.position.y, dz: m.position.z - onGlass(m.position.x, m.position.y),
    eye: (bot.eyes as Object3D[]).includes(m) || (bot.happyEyes as Object3D[]).includes(m) || (bot.eyeGlows as Object3D[]).includes(m),
  }));

  // Boot-up: eyes dark, Byte low and small; then the screen flickers on and Byte rises.
  let boot = -1; // -1 not started; seconds since boot began
  let onBooted: (() => void) | undefined;
  let booted = false;

  // Blinks and saccades
  let blinkAt = 2.5, blinkT = -1, doubleBlink = false;
  let saccadeAt = 1.2, sx = 0, sy = 0;

  // Idle fidgets
  let idleAt = 5, idle: { kind: 'glance' | 'tilt' | 'wiggle'; t: number; dir: number } | null = null;

  // Jump
  let jumpT = -1;
  let happyUntil = 0;

  function celebrate() {
    if (jumpT >= 0) return;
    jumpT = 0;
    happyUntil = clock + 1.8;
    for (const s of bot.sparks) {
      const a = Math.random() * Math.PI * 2;
      s.mesh.position.set((Math.random() - 0.5) * 0.4, 1.2, 0.5);
      s.vx = Math.cos(a) * (1.1 + Math.random() * 1.2);
      s.vy = 2.6 + Math.random() * 2;
      s.vz = Math.sin(a) * 0.7 + 0.4;
      s.spin = (Math.random() - 0.5) * 14;
      s.life = 1;
      s.mesh.visible = true;
    }
  }

  function update(dt: number) {
    clock += dt;
    const t = clock;
    stage.tintRim(dt);

    // ---- boot sequence
    let eyePower = 1, jetBoost = 0;
    if (boot >= 0) {
      boot += dt;
      const b = boot;
      // two flickers, then on
      eyePower = b < 0.45 ? 0 : b < 0.55 ? 0.6 : b < 0.62 ? 0.1 : b < 0.75 ? 0.9 : b < 0.8 ? 0.3 : clamp01((b - 0.8) / 0.25);
      jetBoost = b < 1.2 ? 1.2 : Math.max(0, 1.2 - (b - 1.2) * 3);
      bot.bulbMat.emissiveIntensity = b < 0.6 ? ((b * 6) % 1 < 0.5 ? 2.2 : 0.2) : 1.4;
      if (b > 0.55) lift.step(0, dt); else lift.step(-0.7, dt);
      if (b > 1.5 && !booted) { booted = true; onBooted?.(); }
      if (b > 2) boot = -2; // done
    } else if (boot === -1) {
      eyePower = 0; // waiting to boot
      lift.step(-0.7, dt);
    } else {
      lift.step(0, dt);
      bot.bulbMat.emissiveIntensity = 1.3 + Math.sin(t * 3.2) * 0.25;
    }

    // ---- blinks and saccades
    if (t > blinkAt && blinkT < 0) { blinkT = 0; }
    let lid = 1;
    if (blinkT >= 0) {
      blinkT += dt;
      lid = blinkT < 0.07 ? 1 - blinkT / 0.07 : clamp01((blinkT - 0.07) / 0.09);
      if (blinkT > 0.16) {
        blinkT = -1;
        if (doubleBlink) { doubleBlink = false; blinkAt = t + 0.12; }
        else { doubleBlink = Math.random() < 0.18; blinkAt = t + 2.2 + Math.random() * 3.2; }
      }
    }
    if (t > saccadeAt) {
      sx = (Math.random() - 0.5) * 0.06; sy = (Math.random() - 0.5) * 0.04;
      saccadeAt = t + 0.6 + Math.random() * 1.6;
    }
    eyeOpen.step(hover ? 1.18 : 1, dt);

    // ---- idle fidgets every few seconds
    if (!idle && t > idleAt && boot < -1) {
      const kinds = ['glance', 'tilt', 'wiggle'] as const;
      idle = { kind: kinds[Math.floor(Math.random() * kinds.length)], t: 0, dir: Math.random() < 0.5 ? -1 : 1 };
      if (idle.kind === 'wiggle') { antZ.kick(2.2 * idle.dir); }
    }
    let gx = 0, gy = 0, tilt = 0;
    if (idle) {
      idle.t += dt;
      const k = Math.sin(clamp01(idle.t / 1.4) * Math.PI);
      if (idle.kind === 'glance') { gx = 0.7 * idle.dir * k; gy = 0.15 * k; }
      if (idle.kind === 'tilt') tilt = 0.2 * idle.dir * k;
      if (idle.t > 1.4) { idle = null; idleAt = t + 4 + Math.random() * 4; }
    }

    // ---- head, gaze and body
    const p = poses[pose];
    const lx = Math.max(-1, Math.min(1, look.x + gx));
    const ly = Math.max(-1, Math.min(1, look.y + gy));
    const prevHeadY = headY.x, prevHeadX = headX.x;
    bot.head.rotation.y = headY.step(lx * 0.55, dt);
    bot.head.rotation.x = headX.step(-ly * 0.3, dt);
    bot.head.rotation.z = headZ.step(p.tilt + tilt + (pose === 'think' ? Math.sin(t * 1.3) * 0.03 : 0), dt);
    bot.torso.rotation.y = bodyY.step(lx * 0.2, dt);
    const fx = faceX.step(lx * 0.07, dt) + eyeX.step(sx, dt);
    const fy = faceY.step(ly * 0.05, dt) + eyeY.step(sy, dt);
    for (const part of parts) {
      const x = part.bx + (part.eye ? fx : fx * 0.6);
      const y = part.by + (part.eye ? fy : fy * 0.6);
      part.m.position.set(x, y, onGlass(x, y) + part.dz);
    }

    // ---- eyes: power, blink, hover, happy
    const happy = t < happyUntil || pose === 'rocket';
    bot.eyeMat.emissiveIntensity = EYE_ON * eyePower * (hover ? 1.2 : 1);
    bot.cheekMat.emissiveIntensity = (hover || happy ? 1.4 : 0.9) * Math.max(0.2, eyePower);
    bot.eyes.forEach((e) => { e.visible = !happy; e.scale.set(eyeOpen.x, Math.max(0.08, lid) * eyeOpen.x, 1); });
    bot.happyEyes.forEach((e) => (e.visible = happy));
    bot.eyeGlows.forEach((g) => { g.visible = !happy; (g.material as { opacity: number }).opacity = 0.32 * eyePower * lid; });

    // ---- arms (springy, with per-pose motion on top)
    let rz = p.rz, lxArm = p.lx, rxArm = p.rx;
    if (pose === 'hello' || pose === 'wave') rz += Math.sin(t * 8.5) * (pose === 'wave' ? 0.42 : 0.3);
    if (pose === 'type') { lxArm += Math.sin(t * 16) * 0.16; rxArm += Math.sin(t * 16 + Math.PI) * 0.16; }
    if (pose === 'rocket') rz += Math.sin(t * 5) * 0.08;
    bot.armL.rotation.x = armLx.step(lxArm, dt);
    bot.armL.rotation.z = armLz.step(p.lz + Math.sin(t * 1.9) * 0.05, dt);
    bot.armR.rotation.x = armRx.step(rxArm, dt);
    bot.armR.rotation.z = armRz.step(rz, dt);
    bot.card.visible = pose === 'work';

    // ---- float, jump (squash and stretch) and contact shadow
    let jumpY = 0;
    if (jumpT >= 0) {
      jumpT += dt;
      const j = jumpT;
      if (j < 0.12) squash.step(0.84, dt);                     // anticipate
      else if (j < 0.5) { squash.step(1.12, dt); jumpY = Math.sin(((j - 0.12) / 0.38) * Math.PI) * 0.75; } // up and down
      else if (j < 0.62) squash.step(0.88, dt);                // land
      else { squash.step(1, dt); if (j > 1.1) jumpT = -1; }
    } else squash.step(1, dt);
    const sY = squash.x, sXZ = 1 / Math.sqrt(sY);
    const floatY = Math.sin(t * 1.6) * 0.11;
    const accel = -Math.sin(t * 1.6) * 0.11 * 1.6 * 1.6;
    bot.floater.position.y = floatY + jumpY + lift.x;
    bot.floater.scale.set(sXZ, sY, sXZ);
    bot.floater.rotation.z = Math.sin(t * 0.9) * 0.035 + bank.step(-travel * 0.00012, dt);
    bot.torso.scale.setScalar(1 + Math.sin(t * 3.2) * 0.01);
    const h = Math.max(0, bot.floater.position.y + 0.2);
    stage.contact.scale.setScalar(3.1 * (1 - 0.18 * h));
    (stage.contact.material as { opacity: number }).opacity = 0.3 * (1 - 0.4 * Math.min(1, h)) * (boot === -1 ? 0.4 : 1);

    // ---- antenna: driven by head turns and the float, so it sways a beat behind
    antZ.kick(-(bot.head.rotation.y - prevHeadY) * 6 + accel * dt * 0.6);
    antX.kick((bot.head.rotation.x - prevHeadX) * 6 + (jumpT >= 0 ? -dt * 6 : 0));
    bot.antenna.rotation.z = antZ.step(0, dt);
    bot.antenna.rotation.x = antX.step(0, dt);

    // ---- jet: flicker, boosted by boot, rockets, jumps and flight
    const boost = jetBoost + (pose === 'rocket' ? 0.6 : 0) + (jumpT >= 0 && jumpT < 0.5 ? 0.8 : 0) + Math.min(0.8, Math.abs(travel) * 0.0006);
    bot.flame.scale.set(1 + boost * 0.15, 0.8 + Math.sin(t * 31) * 0.1 + Math.random() * 0.08 + boost * 0.5, 1 + boost * 0.15);

    // ---- confetti
    for (const s of bot.sparks) {
      if (s.life <= 0) continue;
      s.life -= dt * 0.8;
      s.vy -= 6 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.rotation.z += s.spin * dt;
      s.mesh.rotation.y += s.spin * 0.5 * dt;
      s.mesh.scale.setScalar(Math.max(0.01, Math.min(1, s.life * 2)));
      if (s.life <= 0) s.mesh.visible = false;
    }
  }

  return {
    update,
    celebrate,
    boot(done?: () => void) { boot = 0; onBooted = done; },
    setPose(next: Pose) {
      if (next !== pose) { headZ.kick(next === 'think' ? 1.2 : -0.8); antZ.kick(1.5); }
      pose = next;
    },
    setHover(on: boolean) { if (on && !hover) antZ.kick(1.8); hover = on; },
    setTravel(v: number) { travel = Math.max(-2500, Math.min(2500, v)); },
    lookAt(x: number, y: number) { look.x = Math.max(-1, Math.min(1, x)); look.y = Math.max(-1, Math.min(1, y)); },
    /** Jump straight to the settled pose (used for poster renders). */
    settle(next: Pose) {
      pose = next; boot = -2; lift.x = 0; eyeOpen.x = 1; booted = true;
      clock = 0; blinkAt = 99; saccadeAt = 99; sx = sy = 0; idle = null; idleAt = 99; hover = false; travel = 0;
    },
  };
}

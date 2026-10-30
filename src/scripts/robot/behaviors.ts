// Everything Byte does per frame: float, look at the pointer, blink, poses, and celebrate.
import { MathUtils } from 'three';
import type { Robot } from './robot';

export type Pose = 'hello' | 'work' | 'type' | 'rocket' | 'think' | 'wave';

type ArmTarget = { lx: number; lz: number; rx: number; rz: number };
const poses: Record<Pose, ArmTarget> = {
  hello: { lx: 0, lz: -0.25, rx: 0, rz: 2.5 },
  work: { lx: -1.35, lz: -0.35, rx: -1.35, rz: 0.35 },
  type: { lx: -1.1, lz: -0.2, rx: -1.1, rz: 0.2 },
  rocket: { lx: 0, lz: -2.6, rx: 0, rz: 2.6 },
  think: { lx: 0, lz: -0.2, rx: -2.2, rz: -0.9 },
  wave: { lx: 0, lz: -0.25, rx: 0, rz: 2.5 },
};

export function createBehaviors(bot: Robot) {
  const look = { x: 0, y: 0 };
  let pose: Pose = 'hello';
  let blinkAt = 1.5;
  let blinkT = -1;
  let jumpT = -1;
  let happyUntil = 0;
  let clock = 0;

  const damp = (from: number, to: number, lambda: number, dt: number) => MathUtils.damp(from, to, lambda, dt);

  function celebrate() {
    jumpT = 0;
    happyUntil = clock + 1.6;
    for (const s of bot.sparks) {
      const a = Math.random() * Math.PI * 2;
      s.mesh.position.set(0, 1, 0.4);
      s.vx = Math.cos(a) * (1.2 + Math.random());
      s.vy = 2 + Math.random() * 1.8;
      s.vz = Math.sin(a) * 0.6;
      s.life = 1;
      s.mesh.visible = true;
    }
  }

  function update(dt: number) {
    clock += dt;
    const t = clock;

    // Idle float and a little breathing.
    let jumpY = 0;
    if (jumpT >= 0) {
      jumpT += dt;
      jumpY = Math.max(0, Math.sin(Math.min(jumpT / 0.55, 1) * Math.PI)) * 0.7;
      if (jumpT > 0.55) jumpT = -1;
    }
    bot.floater.position.y = Math.sin(t * 1.6) * 0.12 + jumpY;
    bot.floater.rotation.z = Math.sin(t * 0.9) * 0.04;
    bot.torso.scale.setScalar(1 + Math.sin(t * 3.2) * 0.012);

    // Head and face follow the pointer; the body turns a little less.
    bot.head.rotation.y = damp(bot.head.rotation.y, look.x * 0.55, 6, dt);
    bot.head.rotation.x = damp(bot.head.rotation.x, -look.y * 0.3, 6, dt);
    bot.torso.rotation.y = damp(bot.torso.rotation.y, look.x * 0.2, 4, dt);
    bot.face.position.x = damp(bot.face.position.x, look.x * 0.08, 8, dt);
    bot.face.position.y = damp(bot.face.position.y, look.y * 0.05, 8, dt);

    // Blink every few seconds, sometimes twice.
    if (t > blinkAt && blinkT < 0) blinkT = 0;
    if (blinkT >= 0) {
      blinkT += dt;
      const s = blinkT < 0.08 ? 1 - blinkT / 0.08 : Math.min((blinkT - 0.08) / 0.08, 1);
      bot.eyes.forEach((e) => (e.scale.y = Math.max(0.1, s)));
      if (blinkT > 0.16) {
        blinkT = -1;
        blinkAt = t + (Math.random() < 0.2 ? 0.25 : 2 + Math.random() * 3);
      }
    }
    const happy = t < happyUntil || pose === 'rocket';
    bot.eyes.forEach((e) => (e.visible = !happy));
    bot.happyEyes.forEach((e) => (e.visible = happy));

    // Arms ease toward the current pose, with a per-pose motion on top.
    const target = poses[pose];
    let rz = target.rz;
    let lx = target.lx;
    let rx = target.rx;
    if (pose === 'hello' || pose === 'wave') rz += Math.sin(t * 9) * 0.35;
    if (pose === 'type') { lx += Math.sin(t * 18) * 0.18; rx += Math.sin(t * 18 + Math.PI) * 0.18; }
    if (pose === 'rocket') rz += Math.sin(t * 6) * 0.1;
    bot.armL.rotation.x = damp(bot.armL.rotation.x, lx, 7, dt);
    bot.armL.rotation.z = damp(bot.armL.rotation.z, target.lz + Math.sin(t * 2) * 0.05, 7, dt);
    bot.armR.rotation.x = damp(bot.armR.rotation.x, rx, 7, dt);
    bot.armR.rotation.z = damp(bot.armR.rotation.z, rz, 7, dt);
    bot.card.visible = pose === 'work';

    // Antenna pulse and jet flicker.
    bot.bulbMat.color.setHSL(0.92, 1, 0.68 + Math.sin(t * 4) * 0.08);
    bot.flame.scale.set(1, 0.8 + Math.sin(t * 30) * 0.12 + Math.random() * 0.08 + (pose === 'rocket' ? 0.6 : 0), 1);

    for (const s of bot.sparks) {
      if (s.life <= 0) continue;
      s.life -= dt * 0.9;
      s.vy -= 5 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.rotation.y += dt * 6;
      s.mesh.scale.setScalar(Math.max(s.life, 0.01));
      if (s.life <= 0) s.mesh.visible = false;
    }
  }

  return {
    update,
    celebrate,
    setPose(next: Pose) { pose = next; },
    lookAt(x: number, y: number) { look.x = MathUtils.clamp(x, -1, 1); look.y = MathUtils.clamp(y, -1, 1); },
  };
}

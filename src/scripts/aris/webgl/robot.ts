// ARIS-1, the exo-architect astronaut robot from the design sheet: white armour over a navy
// pressure suit, a glass dome with a robotic head inside, multi-spectral cameras, a backpack with
// a battery and twin thrusters, a manipulator claw on the right forearm and a multi-tool on the
// left. Everything is built from primitives, so there is no model file to download.
import {
  AdditiveBlending, CanvasTexture, CapsuleGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry,
  DoubleSide, Group, LatheGeometry, type Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, type BufferGeometry, type Object3D, PlaneGeometry, PointLight, Quaternion, SphereGeometry,
  Sprite, SpriteMaterial, TorusGeometry, Vector2, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const palette = {
  armor: '#e6ebf2', pack: '#cfd7e2', panel: '#97a4b8', suit: '#25314b', joint: '#39465f',
  teal: '#3ff3dc', cyan: '#6cc9ff', amber: '#ffb547', rose: '#ff5f7e', glass: '#d4f1ff',
};

// Radial glow for lights: additive sprites stand in for bloom without a post-processing pass.
let glowTex: CanvasTexture | undefined;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,255,255,.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new CanvasTexture(c);
  return glowTex;
}
export const glow = (color: string, size: number, opacity: number) => {
  const s = new Sprite(new SpriteMaterial({ map: glowTexture(), color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
};

const emissive = (color: string, intensity: number) => new MeshStandardMaterial({
  color: new Color('#000000'), emissive: new Color(color), emissiveIntensity: intensity, roughness: 0.4,
});

/** A cylinder from a to b (antennas, brackets). */
function rod(a: Vector3, b: Vector3, radius: number, material: Material) {
  const dir = new Vector3().subVectors(b, a);
  const mesh = new Mesh(new CylinderGeometry(radius, radius, dir.length(), 12), material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()));
  return mesh;
}

export type Robot = ReturnType<typeof buildRobot>;
export type Arm = ReturnType<typeof buildRobot>['arms']['left'];

export function buildRobot() {
  const armor = new MeshPhysicalMaterial({ color: palette.armor, metalness: 0.3, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const pack = new MeshPhysicalMaterial({ color: palette.pack, metalness: 0.45, roughness: 0.38, clearcoat: 0.4 });
  const panel = new MeshPhysicalMaterial({ color: palette.panel, metalness: 0.78, roughness: 0.3 });
  const suit = new MeshStandardMaterial({ color: palette.suit, metalness: 0.35, roughness: 0.62 });
  const joint = new MeshStandardMaterial({ color: palette.joint, metalness: 0.85, roughness: 0.3 });
  const dark = new MeshStandardMaterial({ color: '#0b111d', metalness: 0.6, roughness: 0.45 });
  const visorMat = new MeshPhysicalMaterial({ color: '#04070d', metalness: 0.55, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.04 });
  const glassMat = new MeshPhysicalMaterial({
    color: palette.glass, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.1,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.4, depthWrite: false,
  });
  // A Fresnel rim: glass catches more light at grazing angles, which is what makes a clear dome
  // readable against dark space.
  glassMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.6);
      gl_FragColor.rgb += vec3(0.62, 0.9, 1.0) * rim * 0.75;
      gl_FragColor.a = clamp(gl_FragColor.a + rim * 0.55, 0.0, 1.0);`);
  };
  const eyeMat = emissive(palette.teal, 1.5);
  const reactorMat = emissive(palette.teal, 1.2);
  const ventMat = emissive(palette.teal, 1.1);
  const amberMat = emissive(palette.amber, 1.4);
  const roseMat = emissive(palette.rose, 1.4);
  const cyanMat = emissive(palette.cyan, 1.4);

  const add = <T extends Object3D>(parent: Object3D, obj: T, x = 0, y = 0, z = 0) => {
    obj.position.set(x, y, z);
    parent.add(obj);
    return obj;
  };
  const mesh = (geo: BufferGeometry, mat: Material) => new Mesh(geo, mat);

  const root = new Group();
  const floater = add(root, new Group());  // bob, lift and roll
  const body = add(floater, new Group());  // yaw: turning round, facing a card
  const lean = add(body, new Group());     // pitch: leaning into a flight

  // ---- torso
  const torso = add(lean, new Group());
  add(torso, mesh(new RoundedBoxGeometry(0.92, 0.34, 0.6, 4, 0.12), armor), 0, -0.42, 0);
  add(torso, mesh(new RoundedBoxGeometry(0.98, 0.1, 0.64, 3, 0.04), panel), 0, -0.24, 0);
  for (let i = 0; i < 3; i++) add(torso, mesh(new RoundedBoxGeometry(0.8 - i * 0.05, 0.13, 0.52, 3, 0.05), suit), 0, -0.12 + i * 0.15, 0);
  add(torso, mesh(new RoundedBoxGeometry(1.4, 0.84, 0.82, 6, 0.25), armor), 0, 0.62, 0);
  for (const side of [-1, 1]) {
    add(torso, mesh(new RoundedBoxGeometry(0.2, 0.55, 0.66, 3, 0.06), panel), side * 0.66, 0.56, 0);
    // two short vents above the reactor
    for (let i = 0; i < 3; i++) add(torso, mesh(new RoundedBoxGeometry(0.2, 0.026, 0.02, 1, 0.01), dark), side * 0.35, 0.88 - i * 0.055, 0.405);
  }
  // Fusion reactor in the chest.
  const reactor = add(torso, new Group(), 0, 0.6, 0.415);
  add(reactor, mesh(new TorusGeometry(0.155, 0.04, 16, 48), panel));
  add(reactor, mesh(new CircleGeometry(0.118, 48), reactorMat), 0, 0, 0.006);
  add(reactor, mesh(new TorusGeometry(0.07, 0.012, 8, 32), emissive('#c8fff6', 1.2)), 0, 0, 0.012);
  const reactorGlow = add(reactor, glow(palette.teal, 0.95, 0.55), 0, 0, 0.06);
  const reactorLight = add(reactor, new PointLight(palette.teal, 0, 3, 2), 0, 0, 0.35);

  // ---- head: pivots at the neck, a robotic head under a glass dome
  const head = add(lean, new Group(), 0, 1.08, 0);
  add(head, mesh(new CylinderGeometry(0.2, 0.25, 0.16, 28), joint), 0, 0.04, 0);
  const collar = add(head, mesh(new TorusGeometry(0.58, 0.075, 16, 64), panel), 0, 0.02, 0);
  collar.rotation.x = Math.PI / 2;
  add(head, mesh(new RoundedBoxGeometry(0.66, 0.6, 0.6, 6, 0.19), armor), 0, 0.46, 0);
  for (const side of [-1, 1]) {
    const ear = add(head, mesh(new CylinderGeometry(0.13, 0.13, 0.08, 28), panel), side * 0.34, 0.46, 0);
    ear.rotation.z = Math.PI / 2;
  }
  add(head, mesh(new RoundedBoxGeometry(0.54, 0.22, 0.07, 4, 0.05), visorMat), 0, 0.51, 0.29);
  const eyes = [-0.12, 0.12].map((x) => add(head, mesh(new CircleGeometry(0.05, 32), eyeMat), x, 0.51, 0.327));
  const eyeGlows = [-0.12, 0.12].map((x) => add(head, glow(palette.teal, 0.34, 0.5), x, 0.51, 0.35));
  // The visor's scan bar sweeps up and down during a visor inspection.
  const scanBar = add(head, mesh(new PlaneGeometry(0.44, 0.022), new MeshBasicMaterial({ color: palette.teal, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })), 0, 0.51, 0.329);
  for (let i = 0; i < 3; i++) add(head, mesh(new RoundedBoxGeometry(0.22, 0.016, 0.016, 1, 0.006), dark), 0, 0.33 - i * 0.034, 0.302);
  const dome = add(head, mesh(new SphereGeometry(0.72, 48, 32), glassMat), 0, 0.5, 0);
  dome.renderOrder = 2;
  // Multi-spectral camera pod on the right of the dome, on a bracket from the collar.
  add(head, rod(new Vector3(-0.56, 0.05, -0.05), new Vector3(-0.78, 0.68, 0), 0.026, joint));
  const pod = add(head, new Group(), -0.79, 0.8, 0.02);
  add(pod, mesh(new RoundedBoxGeometry(0.17, 0.24, 0.22, 3, 0.04), joint));
  [palette.teal, palette.cyan, palette.amber].forEach((c, i) => {
    const lens = add(pod, mesh(new CylinderGeometry(0.032, 0.032, 0.03, 20), i === 0 ? eyeMat : i === 1 ? cyanMat : amberMat), 0, 0.07 - i * 0.07, 0.115);
    lens.rotation.x = Math.PI / 2;
    add(pod, glow(c, 0.12, 0.6), 0, 0.07 - i * 0.07, 0.14);
  });
  // Sensor antenna on the left.
  add(head, rod(new Vector3(0.44, 0.2, -0.26), new Vector3(0.62, 1.18, -0.3), 0.013, panel));
  const tipHead = add(head, mesh(new SphereGeometry(0.03, 16, 12), roseMat), 0.62, 1.19, -0.3);
  add(tipHead, glow(palette.rose, 0.18, 0.7));

  // ---- arms pivot at the shoulder; the right forearm carries the claw, the left the multi-tool
  const makeArm = (side: 1 | -1) => {
    const shoulder = add(torso, new Group(), side * 0.86, 0.84, 0);
    const pauldron = add(shoulder, mesh(new SphereGeometry(0.34, 32, 24), armor), side * 0.05, 0.05, 0);
    pauldron.scale.set(1.05, 0.86, 1);
    const band = add(shoulder, mesh(new TorusGeometry(0.26, 0.04, 12, 40), panel), side * 0.02, -0.15, 0);
    band.rotation.x = Math.PI / 2;
    add(shoulder, mesh(new CapsuleGeometry(0.12, 0.4, 6, 20), suit), 0, -0.38, 0);
    add(shoulder, mesh(new CylinderGeometry(0.185, 0.165, 0.34, 28), armor), 0, -0.38, 0);
    const elbow = add(shoulder, new Group(), 0, -0.7, 0);
    add(elbow, mesh(new SphereGeometry(0.15, 24, 16), joint));
    add(elbow, mesh(new CylinderGeometry(0.19, 0.145, 0.5, 28), armor), 0, -0.3, 0);
    const cuff = add(elbow, mesh(new TorusGeometry(0.176, 0.02, 8, 32), side === -1 ? ventMat : panel), 0, -0.13, 0);
    cuff.rotation.x = Math.PI / 2;
    const wrist = add(elbow, new Group(), 0, -0.6, 0);
    add(wrist, mesh(new SphereGeometry(0.085, 20, 14), joint));
    add(wrist, mesh(new RoundedBoxGeometry(0.2, 0.2, 0.11, 3, 0.04), joint), 0, -0.14, 0);
    const fingers = add(wrist, new Group(), 0, -0.24, 0);
    for (let i = 0; i < 4; i++) add(fingers, mesh(new CapsuleGeometry(0.028, 0.1, 4, 10), suit), -0.075 + i * 0.05, -0.06, 0);
    const thumb = add(wrist, mesh(new CapsuleGeometry(0.03, 0.09, 4, 10), suit), -side * 0.11, -0.16, 0.04);
    thumb.rotation.z = side * 0.6;

    let jaws: Group[] = [];
    if (side === -1) {
      // Modular tool changer: a housing on the outside of the forearm and a two-jaw claw.
      add(elbow, mesh(new CylinderGeometry(0.08, 0.08, 0.36, 20), panel), side * 0.21, -0.3, 0.02);
      const claw = add(elbow, new Group(), side * 0.21, -0.5, 0.02);
      add(claw, mesh(new CylinderGeometry(0.05, 0.06, 0.06, 16), joint));
      jaws = [-1, 1].map((d) => {
        const pivot = add(claw, new Group(), 0, -0.02, d * 0.035);
        add(pivot, mesh(new RoundedBoxGeometry(0.035, 0.2, 0.035, 2, 0.012), joint), 0, -0.1, 0);
        add(pivot, mesh(new RoundedBoxGeometry(0.035, 0.07, 0.035, 2, 0.012), joint), 0, -0.2, -d * 0.02).rotation.x = d * 0.6;
        return pivot;
      });
      add(claw, glow(palette.teal, 0.14, 0.7), 0, -0.04, 0.06);
    } else {
      // Multi-tool arm: a tapered tool head with a status ring.
      add(elbow, mesh(new CylinderGeometry(0.09, 0.075, 0.3, 20), panel), side * 0.21, -0.3, 0.02);
      add(elbow, mesh(new ConeGeometry(0.055, 0.12, 16), joint), side * 0.21, -0.51, 0.02).rotation.x = Math.PI;
      const ring = add(elbow, mesh(new TorusGeometry(0.092, 0.013, 8, 28), cyanMat), side * 0.21, -0.4, 0.02);
      ring.rotation.x = Math.PI / 2;
    }
    return { shoulder, elbow, wrist, fingers, jaws };
  };
  const arms = { right: makeArm(-1), left: makeArm(1) };

  // ---- legs: hip, knee and ankle pivots; the boots grip with a split toe
  const makeLeg = (side: 1 | -1) => {
    const hip = add(torso, new Group(), side * 0.29, -0.55, 0);
    add(hip, mesh(new SphereGeometry(0.19, 24, 16), joint));
    add(hip, mesh(new CapsuleGeometry(0.17, 0.34, 6, 20), suit), 0, -0.36, 0);
    add(hip, mesh(new RoundedBoxGeometry(0.42, 0.5, 0.44, 4, 0.15), armor), 0, -0.36, 0.01);
    const knee = add(hip, new Group(), 0, -0.74, 0);
    add(knee, mesh(new SphereGeometry(0.17, 24, 16), joint));
    add(knee, mesh(new RoundedBoxGeometry(0.28, 0.26, 0.14, 3, 0.06), armor), 0, 0.01, 0.15);
    add(knee, mesh(new CylinderGeometry(0.2, 0.155, 0.6, 28), armor), 0, -0.35, 0);
    add(knee, mesh(new RoundedBoxGeometry(0.17, 0.38, 0.05, 2, 0.02), panel), 0, -0.33, 0.185);
    const ankle = add(knee, new Group(), 0, -0.7, 0);
    add(ankle, mesh(new SphereGeometry(0.12, 20, 14), joint));
    add(ankle, mesh(new RoundedBoxGeometry(0.38, 0.25, 0.54, 4, 0.1), armor), 0, -0.15, 0.07);
    add(ankle, mesh(new RoundedBoxGeometry(0.4, 0.07, 0.56, 2, 0.03), joint), 0, -0.28, 0.07);
    for (const d of [-1, 1]) add(ankle, mesh(new RoundedBoxGeometry(0.15, 0.09, 0.13, 2, 0.035), joint), d * 0.095, -0.26, 0.35);
    add(ankle, mesh(new RoundedBoxGeometry(0.22, 0.024, 0.01, 1, 0.005), ventMat), 0, -0.13, 0.342);
    return { hip, knee, ankle };
  };
  const legs = { right: makeLeg(-1), left: makeLeg(1) };

  // ---- backpack: battery, vents, tanks, antennas and twin thrusters
  const packGroup = add(lean, new Group(), 0, 0.42, -0.66);
  add(packGroup, mesh(new RoundedBoxGeometry(1.12, 1.22, 0.5, 5, 0.14), pack));
  add(packGroup, mesh(new RoundedBoxGeometry(1.0, 0.16, 0.44, 3, 0.06), joint), 0, 0.66, 0);
  for (let i = 0; i < 5; i++) add(packGroup, mesh(new RoundedBoxGeometry(0.66, 0.034, 0.04, 1, 0.012), dark), 0, 0.38 - i * 0.08, -0.252);
  add(packGroup, mesh(new RoundedBoxGeometry(0.54, 0.36, 0.12, 3, 0.04), joint), 0, -0.2, -0.29);
  const cells = [-0.16, 0, 0.16].map((x) => add(packGroup, mesh(new RoundedBoxGeometry(0.1, 0.05, 0.02, 1, 0.01), ventMat), x, -0.2, -0.356));
  for (const side of [-1, 1]) add(packGroup, mesh(new CylinderGeometry(0.11, 0.11, 0.92, 24), armor), side * 0.6, 0, -0.02);
  const thrusterMat = emissive(palette.teal, 1.2);
  const nozzleGeo = new LatheGeometry([
    new Vector2(0.07, 0.03), new Vector2(0.1, 0), new Vector2(0.15, -0.15), new Vector2(0.165, -0.21),
    new Vector2(0.14, -0.21), new Vector2(0.095, -0.05), new Vector2(0.06, 0.0),
  ], 36);
  const nozzleMat = new MeshPhysicalMaterial({ color: '#7d889c', metalness: 1, roughness: 0.28, side: DoubleSide });
  const thrusters = [-1, 1].map((side) => {
    const t = add(packGroup, new Group(), side * 0.3, -0.64, -0.02);
    add(t, mesh(nozzleGeo, nozzleMat));
    const core = add(t, mesh(new CircleGeometry(0.1, 24), thrusterMat), 0, -0.04, 0);
    core.rotation.x = Math.PI / 2;
    const flame = add(t, new Group(), 0, -0.2, 0);
    const outer = add(flame, mesh(new ConeGeometry(0.14, 0.7, 24, 1, true), new MeshBasicMaterial({ color: '#4ff6e2', transparent: true, opacity: 0.42, blending: AdditiveBlending, depthWrite: false })), 0, -0.35, 0);
    const inner = add(flame, mesh(new ConeGeometry(0.07, 0.4, 16, 1, true), new MeshBasicMaterial({ color: '#eafffc', transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false })), 0, -0.2, 0);
    outer.rotation.x = inner.rotation.x = Math.PI;
    const flameGlow = add(t, glow(palette.teal, 0.9, 0.5), 0, -0.24, 0);
    return { flame, glow: flameGlow };
  });
  for (const side of [-1, 1]) {
    add(packGroup, rod(new Vector3(side * 0.42, 0.7, -0.05), new Vector3(side * 0.5, 1.55, -0.12), 0.014, panel));
    const tip = add(packGroup, mesh(new SphereGeometry(0.03, 16, 12), side < 0 ? amberMat : eyeMat), side * 0.5, 1.56, -0.12);
    add(tip, glow(side < 0 ? palette.amber : palette.teal, 0.2, 0.7));
  }

  // Solid surfaces cast and take shadows; glass, glows and lights do not.
  root.traverse((o) => {
    const m = o as Mesh;
    const mat = m.material as MeshStandardMaterial | undefined;
    if (m.isMesh && mat?.isMeshStandardMaterial && !mat.transparent && mat.emissive.getHex() === 0) { m.castShadow = true; m.receiveShadow = true; }
  });

  return {
    root, floater, body, lean, torso, head, dome, eyes, eyeGlows, eyeMat, scanBar,
    reactor: { group: reactor, mat: reactorMat, glow: reactorGlow, light: reactorLight },
    arms, legs, thrusters, thrusterMat, cells, ventMat,
  };
}

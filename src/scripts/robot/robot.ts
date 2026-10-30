// Byte, built like a premium vinyl toy: glossy clear-coated plastic, a curved glass visor with
// glowing eyes, satin metal details. Everything is made from primitives, so there is no model file.
import {
  AdditiveBlending, CanvasTexture, CapsuleGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry,
  ExtrudeGeometry, Group, LatheGeometry, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial,
  Object3D, PlaneGeometry, Shape, SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, Vector2,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const palette = {
  mint: '#3ddc97', mintDeep: '#22b27a', lemon: '#ffe45e', gold: '#f6c935', sky: '#6fd0ff',
  coral: '#ff8a7a', navy: '#1e3a52', glass: '#0a1a2b', milk: '#f3fff9', metal: '#c9d6df',
};

const vinyl = (color: string, extra: Partial<MeshPhysicalMaterial> = {}) => new MeshPhysicalMaterial({
  color: new Color(color), roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, ...extra,
});
const glowing = (color: string, intensity: number) => new MeshStandardMaterial({
  color: new Color('#000000'), emissive: new Color(color), emissiveIntensity: intensity, roughness: 0.4,
});

// Radial glow used for eyes, bulb and jet: additive sprites stand in for bloom without a post pass.
let glowTex: CanvasTexture | undefined;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new CanvasTexture(c);
  return glowTex;
}
const glow = (color: string, size: number, opacity: number) => {
  const s = new Sprite(new SpriteMaterial({ map: glowTexture(), color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
};

// The screen: a rounded glass slab with a gently domed pane on its face, so highlights glide
// across it as the head turns. (A RoundedBoxGeometry has no vertices inside its flat faces, so
// bending one does nothing; the dome is a subdivided plane with its corners rounded by an alpha map.)
const SCREEN = { w: 1.62, h: 1.04, front: 0.85, dome: 0.04 };
function domedPane() {
  const geo = new PlaneGeometry(SCREEN.w, SCREEN.h, 48, 32);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, domeZ(pos.getX(i), pos.getY(i)));
  geo.computeVertexNormals();
  return geo;
}
/** Where the screen's front surface sits at a given x, y (so face parts sit on the glass). */
function domeZ(x: number, y: number) {
  const u = Math.min(1, (x / (SCREEN.w / 2)) ** 2);
  const v = Math.min(1, (y / (SCREEN.h / 2)) ** 2);
  return SCREEN.front + SCREEN.dome * (1 - u) * (1 - 0.5 * v);
}
function roundedMask() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 164;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 164);
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(2, 2, 252, 160, 22); g.fill();
  return new CanvasTexture(c);
}
/** Depth for a face part sitting on the glass at x, y. */
export const onGlass = (x: number, y: number) => domeZ(x, y) + 0.01;

function eggBody() {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const y = -0.72 + 1.34 * t;
    const r = 0.67 * Math.sqrt(Math.max(0, 1 - ((t - 0.46) / 0.54) ** 2)) * (1.04 - 0.14 * t);
    pts.push(new Vector2(Math.max(r, 0.0001), y));
  }
  return new LatheGeometry(pts, 64);
}

function star() {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.055 : 0.12;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geo = new ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2 });
  geo.center();
  return geo;
}

function shade(obj: Object3D) {
  obj.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const mat = m.material as MeshPhysicalMaterial;
    if (mat.isMeshPhysicalMaterial) { m.castShadow = true; m.receiveShadow = true; }
  });
}

export type Robot = ReturnType<typeof buildRobot>;

export function buildRobot() {
  const root = new Group();
  const floater = new Group();
  root.add(floater);

  // ---- head (pivots at the neck so it can look around)
  const head = new Group();
  head.position.y = 0.95;
  floater.add(head);
  head.add(new Mesh(new RoundedBoxGeometry(2.3, 1.75, 1.6, 10, 0.62), vinyl(palette.mint)));
  const bezel = new Mesh(new RoundedBoxGeometry(2.02, 1.44, 0.2, 8, 0.1), vinyl(palette.mintDeep, { roughness: 0.42 }));
  bezel.position.z = 0.66;
  head.add(bezel);
  const glassMat = new MeshPhysicalMaterial({
    color: new Color(palette.glass), roughness: 0.06, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4,
  });
  const slab = new Mesh(new RoundedBoxGeometry(1.9, 1.32, 0.3, 8, 0.15), glassMat);
  slab.position.z = SCREEN.front - 0.15;
  head.add(slab);
  const pane = new Mesh(domedPane(), new MeshPhysicalMaterial({
    color: new Color(palette.glass), roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6,
    alphaMap: roundedMask(), alphaTest: 0.5, alphaToCoverage: true,
  }));
  // A hair in front of the slab's face so the two never fight for the same depth.
  pane.position.z = 0.004;
  head.add(pane);

  const face = new Group();
  head.add(face);
  const eyeMat = glowing(palette.sky, 2.6);
  const eyeGeo = new CapsuleGeometry(0.12, 0.26, 8, 24);
  const eyes = [-0.4, 0.4].map((x) => {
    const eye = new Mesh(eyeGeo, eyeMat);
    eye.position.set(x, 0.08, onGlass(x, 0.08) - 0.004);
    const shine = new Mesh(new CircleGeometry(0.035, 16), new MeshBasicMaterial({ color: '#ffffff' }));
    shine.position.set(0.045, 0.13, 0.12);
    eye.add(shine);
    face.add(eye);
    return eye;
  });
  const eyeGlows = [-0.4, 0.4].map((x) => {
    const g = glow(palette.sky, 0.6, 0.32);
    g.position.set(x, 0.08, onGlass(x, 0.08) + 0.04);
    face.add(g);
    return g;
  });
  // "^ ^" eyes for happy moments.
  const happyGeo = new TorusGeometry(0.17, 0.055, 12, 32, Math.PI);
  const happyEyes = [-0.4, 0.4].map((x) => {
    const arc = new Mesh(happyGeo, eyeMat);
    arc.position.set(x, 0.02, onGlass(x, 0.02) - 0.004);
    arc.visible = false;
    face.add(arc);
    return arc;
  });
  const mouth = new Mesh(new TorusGeometry(0.13, 0.038, 12, 32, Math.PI), eyeMat);
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -0.3, onGlass(0, -0.3) - 0.004);
  face.add(mouth);
  const cheekMat = glowing(palette.coral, 0.9);
  const cheeks = [-0.66, 0.66].map((x) => {
    const cheek = new Mesh(new CircleGeometry(0.13, 32), cheekMat);
    cheek.scale.y = 0.6;
    cheek.position.set(x, -0.24, onGlass(x, -0.24) - 0.002);
    cheek.rotation.y = 0.06 * x / 0.66;
    face.add(cheek);
    return cheek;
  });

  // ---- ears: lathe-turned cups in satin lemon with a mint ring
  const cup = new LatheGeometry([
    new Vector2(0.0001, 0), new Vector2(0.27, 0), new Vector2(0.31, 0.05), new Vector2(0.31, 0.17),
    new Vector2(0.26, 0.24), new Vector2(0.12, 0.27), new Vector2(0.0001, 0.27),
  ], 48);
  for (const side of [-1, 1]) {
    const ear = new Group();
    ear.position.x = side * 1.1;
    ear.rotation.z = -side * Math.PI / 2;
    ear.add(new Mesh(cup, vinyl(palette.lemon, { roughness: 0.38, clearcoatRoughness: 0.2 })));
    const ring = new Mesh(new TorusGeometry(0.2, 0.035, 16, 48), vinyl(palette.mintDeep));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.27;
    ear.add(ring);
    head.add(ear);
  }

  // ---- antenna on a spring: the group pivots at its base
  const antenna = new Group();
  antenna.position.y = 0.86;
  head.add(antenna);
  const navy = vinyl(palette.navy, { roughness: 0.55, clearcoat: 0.3 });
  antenna.add(new Mesh(new SphereGeometry(0.11, 32, 16), navy));
  const stalk = new Mesh(new CylinderGeometry(0.032, 0.05, 0.5, 24), navy);
  stalk.position.y = 0.27;
  antenna.add(stalk);
  const bulbMat = new MeshPhysicalMaterial({
    color: new Color(palette.coral), emissive: new Color(palette.coral), emissiveIntensity: 1.4, roughness: 0.15, clearcoat: 1,
  });
  const bulb = new Mesh(new SphereGeometry(0.16, 48, 32), bulbMat);
  bulb.position.y = 0.58;
  antenna.add(bulb);
  const bulbGlow = glow(palette.coral, 0.85, 0.55);
  bulbGlow.position.y = 0.58;
  antenna.add(bulbGlow);

  // ---- neck and body
  const neck = new Mesh(new CylinderGeometry(0.28, 0.33, 0.2, 40), navy);
  neck.position.y = 0.06;
  floater.add(neck);
  const torso = new Group();
  torso.position.y = -0.55;
  floater.add(torso);
  torso.add(new Mesh(eggBody(), vinyl(palette.mint)));
  // An ellipsoid sunk into the egg: only a thin oval of it shows, following the body's curve.
  const plate = new Mesh(new SphereGeometry(1, 48, 32), vinyl(palette.milk, { roughness: 0.22 }));
  plate.scale.set(0.42, 0.46, 0.3);
  plate.position.set(0, -0.04, 0.38);
  torso.add(plate);
  const coin = new Mesh(new CylinderGeometry(0.16, 0.16, 0.05, 48), new MeshPhysicalMaterial({
    color: new Color(palette.gold), metalness: 1, roughness: 0.26, clearcoat: 0.6,
  }));
  coin.rotation.x = Math.PI / 2;
  coin.position.set(0, 0.02, 0.655);
  torso.add(coin);
  const coinStar = new Mesh(star(), new MeshPhysicalMaterial({ color: new Color(palette.milk), roughness: 0.3, clearcoat: 1 }));
  coinStar.scale.setScalar(0.85);
  coinStar.position.set(0, 0.02, 0.69);
  torso.add(coinStar);

  // ---- arms pivot at the shoulder; poses rotate these groups
  const makeArm = (side: 1 | -1) => {
    const arm = new Group();
    arm.position.set(side * 0.7, 0.2, 0);
    arm.add(new Mesh(new SphereGeometry(0.16, 32, 16), navy));
    const limb = new Mesh(new CapsuleGeometry(0.125, 0.42, 8, 24), vinyl(palette.mint));
    limb.position.y = -0.33;
    const hand = new Mesh(new SphereGeometry(0.2, 32, 24), vinyl(palette.lemon, { roughness: 0.35 }));
    hand.scale.set(1, 1.08, 0.86);
    hand.position.y = -0.7;
    const thumb = new Mesh(new SphereGeometry(0.075, 24, 16), vinyl(palette.lemon, { roughness: 0.35 }));
    thumb.position.set(-side * 0.15, -0.62, 0.08);
    arm.add(limb, hand, thumb);
    torso.add(arm);
    return arm;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // A small card Byte holds up in the "work" pose.
  const card = new Group();
  card.add(new Mesh(new RoundedBoxGeometry(0.95, 0.66, 0.05, 4, 0.05), vinyl(palette.milk, { roughness: 0.25 })));
  const stripe = new Mesh(new RoundedBoxGeometry(0.62, 0.1, 0.02, 2, 0.04), vinyl(palette.lemon));
  stripe.position.set(-0.08, 0.14, 0.035);
  const dot = new Mesh(new CircleGeometry(0.08, 24), vinyl(palette.mint));
  dot.position.set(0.3, -0.14, 0.03);
  card.add(stripe, dot);
  card.position.set(0, -0.5, 0.78);
  card.visible = false;
  torso.add(card);

  // ---- jet: a turned metal nozzle with a two-layer flame and a glow
  const nozzle = new Mesh(new LatheGeometry([
    new Vector2(0.15, 0.04), new Vector2(0.2, -0.02), new Vector2(0.26, -0.16), new Vector2(0.27, -0.24),
    new Vector2(0.23, -0.25), new Vector2(0.19, -0.13), new Vector2(0.13, 0.0),
  ], 48), new MeshPhysicalMaterial({ color: new Color(palette.metal), metalness: 1, roughness: 0.3, clearcoat: 0.4 }));
  nozzle.position.y = -0.7;
  torso.add(nozzle);
  const flame = new Group();
  flame.position.y = -0.98;
  const outer = new Mesh(new ConeGeometry(0.21, 0.62, 32, 1, true), new MeshBasicMaterial({ color: new Color('#ff9a6b'), transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }));
  const inner = new Mesh(new ConeGeometry(0.11, 0.38, 24, 1, true), new MeshBasicMaterial({ color: new Color('#fff3a8'), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }));
  outer.rotation.x = inner.rotation.x = Math.PI;
  inner.position.y = 0.1;
  const flameGlow = glow('#ffd36b', 1.0, 0.45);
  flameGlow.position.y = 0.22;
  flame.add(outer, inner, flameGlow);
  torso.add(flame);

  // Celebration confetti: glossy stars, recycled from a fixed pool.
  const starGeo = star();
  const starMats = [palette.lemon, palette.coral, palette.sky].map((c) => vinyl(c, { roughness: 0.25 }));
  const sparks = Array.from({ length: 18 }, (_, i) => {
    const m = new Mesh(starGeo, starMats[i % 3]);
    m.visible = false;
    root.add(m);
    return { mesh: m, vx: 0, vy: 0, vz: 0, spin: 0, life: 0 };
  });

  shade(root);

  return {
    root, floater, head, face, eyes, eyeGlows, eyeMat, happyEyes, mouth, cheeks, cheekMat, antenna, bulb, bulbMat, bulbGlow,
    torso, armL, armR, card, flame, sparks,
  };
}

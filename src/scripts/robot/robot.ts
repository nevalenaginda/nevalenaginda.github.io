// Byte: a toy robot built from primitives so there is no model file to download.
import {
  CapsuleGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DataTexture, Group,
  Mesh, MeshBasicMaterial, MeshToonMaterial, NearestFilter, OctahedronGeometry, RedFormat,
  SphereGeometry, TorusGeometry, AdditiveBlending,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const palette = {
  shell: '#8b5cf6', body: '#a78bfa', screen: '#1f1a3d', eye: '#5ef2d6',
  cheek: '#ff6fae', accent: '#ffc83d', joint: '#5f5885', flame: '#ffb347',
};

// Three hard steps give the flat, cartoon shading.
function toonRamp() {
  const tex = new DataTexture(new Uint8Array([90, 180, 255]), 3, 1, RedFormat);
  tex.minFilter = tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export type Robot = ReturnType<typeof buildRobot>;

export function buildRobot() {
  const ramp = toonRamp();
  const toon = (color: string) => new MeshToonMaterial({ color: new Color(color), gradientMap: ramp });
  const glow = (color: string) => new MeshBasicMaterial({ color: new Color(color) });

  const root = new Group();
  const floater = new Group();
  root.add(floater);

  // Head pivots at the neck so it can look around.
  const head = new Group();
  head.position.y = 0.95;
  floater.add(head);
  const shell = new Mesh(new RoundedBoxGeometry(2.3, 1.75, 1.6, 6, 0.6), toon(palette.shell));
  head.add(shell);
  const screen = new Mesh(new RoundedBoxGeometry(1.8, 1.22, 0.2, 5, 0.1), glow(palette.screen));
  screen.position.z = 0.74;
  head.add(screen);

  const face = new Group();
  face.position.z = 0.86;
  head.add(face);
  const eyeGeo = new CapsuleGeometry(0.12, 0.26, 6, 12);
  const eyes = [-0.4, 0.4].map((x) => {
    const eye = new Mesh(eyeGeo, glow(palette.eye));
    eye.position.set(x, 0.08, 0);
    face.add(eye);
    return eye;
  });
  // "^ ^" eyes for happy moments.
  const happyGeo = new TorusGeometry(0.17, 0.055, 8, 20, Math.PI);
  const happyEyes = [-0.4, 0.4].map((x) => {
    const arc = new Mesh(happyGeo, glow(palette.eye));
    arc.position.set(x, 0.02, 0);
    arc.visible = false;
    face.add(arc);
    return arc;
  });
  const mouth = new Mesh(new TorusGeometry(0.13, 0.04, 8, 20, Math.PI), glow(palette.eye));
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -0.3, 0);
  face.add(mouth);
  const cheekMat = new MeshBasicMaterial({ color: new Color(palette.cheek), transparent: true, opacity: 0.85 });
  [-0.68, 0.68].forEach((x) => {
    const cheek = new Mesh(new CircleGeometry(0.13, 20), cheekMat);
    cheek.scale.y = 0.6;
    cheek.position.set(x, -0.24, 0);
    face.add(cheek);
  });

  [-1.2, 1.2].forEach((x) => {
    const ear = new Mesh(new CylinderGeometry(0.22, 0.22, 0.22, 20), toon(palette.accent));
    ear.rotation.z = Math.PI / 2;
    ear.position.x = x;
    head.add(ear);
  });

  const stalk = new Mesh(new CylinderGeometry(0.05, 0.05, 0.5, 8), toon(palette.joint));
  stalk.position.y = 1.1;
  head.add(stalk);
  const bulbMat = new MeshBasicMaterial({ color: new Color(palette.cheek) });
  const bulb = new Mesh(new SphereGeometry(0.17, 20, 16), bulbMat);
  bulb.position.y = 1.42;
  head.add(bulb);

  const torso = new Group();
  torso.position.y = -0.55;
  floater.add(torso);
  const belly = new Mesh(new CapsuleGeometry(0.62, 0.35, 8, 20), toon(palette.body));
  torso.add(belly);
  const badge = new Mesh(new CircleGeometry(0.2, 24), glow(palette.accent));
  badge.position.set(0, 0.05, 0.64);
  torso.add(badge);

  // Arms pivot at the shoulder; poses rotate these groups.
  const makeArm = (side: 1 | -1) => {
    const arm = new Group();
    arm.position.set(side * 0.72, 0.2, 0);
    const limb = new Mesh(new CapsuleGeometry(0.14, 0.45, 6, 12), toon(palette.body));
    limb.position.y = -0.32;
    const hand = new Mesh(new SphereGeometry(0.2, 16, 12), toon(palette.accent));
    hand.position.y = -0.68;
    arm.add(limb, hand);
    torso.add(arm);
    return arm;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // A small pastel card Byte holds up in the "work" pose.
  const card = new Mesh(new RoundedBoxGeometry(0.9, 0.62, 0.06, 3, 0.05), toon('#fff4d6'));
  card.position.set(0, -0.5, 0.75);
  card.visible = false;
  torso.add(card);

  const flame = new Mesh(new ConeGeometry(0.22, 0.6, 16), new MeshBasicMaterial({ color: new Color(palette.flame), transparent: true, opacity: 0.8, blending: AdditiveBlending }));
  flame.rotation.x = Math.PI;
  flame.position.y = -1.25;
  torso.add(flame);

  // Celebration sparkles, recycled from a fixed pool.
  const sparkGeo = new OctahedronGeometry(0.09);
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const m = new Mesh(sparkGeo, glow([palette.cheek, palette.accent, palette.eye][i % 3]));
    m.visible = false;
    root.add(m);
    return { mesh: m, vx: 0, vy: 0, vz: 0, life: 0 };
  });

  return { root, floater, head, face, eyes, happyEyes, mouth, bulb, bulbMat, torso, armL, armR, card, flame, sparks };
}

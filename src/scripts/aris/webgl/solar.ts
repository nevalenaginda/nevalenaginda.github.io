// Solar flight mode: a stylised, not-to-scale solar system with procedurally painted planets, an
// asteroid belt and 3D stars. ARIS-1 flies arcs between bodies and orbits the one it reaches;
// each body is a waypoint for one section of the page (see `waypoints` in src/data/site.ts).
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, DodecahedronGeometry, DoubleSide, Float32BufferAttribute,
  Group, InstancedMesh, LineBasicMaterial, LineLoop, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PerspectiveCamera, Points, PointsMaterial, Quaternion, Raycaster, RingGeometry, SphereGeometry, SRGBColorSpace,
  Vector2, Vector3,
} from 'three';
import type { Waypoint } from '../../../data/site';
import { glow } from './robot';

// ---- procedural painting: hash-based 3D value noise sampled on the sphere, so maps never seam
const hash = (x: number, y: number, z: number, s: number) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function noise(x: number, y: number, z: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi, s), hash(xi + 1, yi, zi, s), u), l(hash(xi, yi + 1, zi, s), hash(xi + 1, yi + 1, zi, s), u), v),
    l(l(hash(xi, yi, zi + 1, s), hash(xi + 1, yi, zi + 1, s), u), l(hash(xi, yi + 1, zi + 1, s), hash(xi + 1, yi + 1, zi + 1, s), u), v),
    w,
  );
}
function fbm(x: number, y: number, z: number, s: number, octaves = 5) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) { sum += amp * noise(x * f, y * f, z * f, s + i); norm += amp; amp *= 0.5; f *= 2.03; }
  return sum / norm;
}
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * Math.min(1, Math.max(0, t)));
const rgb = (hex: string) => { const c = new Color(hex); return [c.r * 255, c.g * 255, c.b * 255]; };
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Paint an equirectangular map: fn gets a point on the unit sphere and its latitude, returns RGBA. */
function paint(w: number, h: number, fn: (x: number, y: number, z: number, lat: number) => number[]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const img = g.createImageData(w, h);
  for (let j = 0; j < h; j++) {
    const lat = (0.5 - (j + 0.5) / h) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < w; i++) {
      const lon = ((i + 0.5) / w) * Math.PI * 2;
      const [r, gr, b, a = 255] = fn(cl * Math.cos(lon), sl, cl * Math.sin(lon), lat);
      const k = (j * w + i) * 4;
      img.data[k] = r; img.data[k + 1] = gr; img.data[k + 2] = b; img.data[k + 3] = a;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const painters: Record<Waypoint, () => CanvasTexture> = {
  sun: () => paint(256, 128, (x, y, z) => {
    // Fine granulation with gentle contrast: a star, not a lava ball.
    const n = fbm(x * 9, y * 9, z * 9, 11, 4);
    return mix(rgb('#ffb04a'), rgb('#fff6cf'), 0.35 + 0.65 * smooth(0.25, 0.8, n));
  }),
  earth: () => paint(512, 256, (x, y, z, lat) => {
    const e = fbm(x * 2.1, y * 2.1, z * 2.1, 3);
    const ice = Math.abs(lat) > 1.2 + (fbm(x * 6, y * 6, z * 6, 9, 3) - 0.5) * 0.2;
    if (ice) return rgb('#eef6ff');
    if (e < 0.52) return mix(rgb('#0b2c6b'), rgb('#2a7fd4'), smooth(0.3, 0.52, e));
    const dry = fbm(x * 4, y * 4, z * 4, 5, 3);
    return mix(mix(rgb('#2f7d3c'), rgb('#c2a46a'), smooth(0.45, 0.65, dry) * (1 - Math.abs(lat) / 1.6)), rgb('#7c6a4c'), smooth(0.62, 0.75, e));
  }),
  mars: () => paint(256, 128, (x, y, z, lat) => {
    if (Math.abs(lat) > 1.32) return rgb('#f3e6dc');
    const e = fbm(x * 2.6, y * 2.6, z * 2.6, 21);
    const dark = smooth(0.55, 0.7, fbm(x * 1.6, y * 1.6, z * 1.6, 23, 3));
    return mix(mix(rgb('#9c3f22'), rgb('#e08a55'), e), rgb('#5e2a18'), dark * 0.7);
  }),
  jupiter: () => paint(512, 256, (x, y, z, lat) => {
    const turb = fbm(x * 3, y * 3, z * 3, 31, 4);
    const band = Math.sin(lat * 17 + turb * 2.6);
    let c = mix(mix(rgb('#a8673f'), rgb('#d9c2a0'), (band + 1) / 2), rgb('#f1e4cc'), smooth(0.6, 0.95, band) * 0.6);
    // The Great Red Spot.
    const lon = Math.atan2(z, x);
    const d = Math.hypot((lon - 1) / 0.32, (lat + 0.38) / 0.12);
    if (d < 1) c = mix(c, rgb('#c2583a'), (1 - d) * 1.4);
    return c;
  }),
  saturn: () => paint(256, 128, (x, y, z, lat) => {
    const band = Math.sin(lat * 14 + fbm(x * 2, y * 2, z * 2, 41, 3) * 1.4);
    return mix(rgb('#c9a86e'), rgb('#f2e3bd'), (band + 1) / 2);
  }),
};

function cloudMap() {
  return paint(512, 256, (x, y, z) => {
    const c = fbm(x * 3.2 + 7, y * 3.2, z * 3.2, 61, 5);
    return [255, 255, 255, smooth(0.52, 0.72, c) * 220];
  });
}

function ringMap() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 4;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 512; i++) {
    const t = i / 512;
    const a = (0.25 + 0.75 * noise(t * 40, 0, 0, 71)) * smooth(0, 0.08, t) * (1 - smooth(0.9, 1, t)) * (t > 0.62 && t < 0.67 ? 0.15 : 1);
    const col = mix(rgb('#d9c08c'), rgb('#f6ead0'), noise(t * 18, 1, 0, 73));
    g.fillStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a.toFixed(3)})`;
    g.fillRect(i, 0, 1, 4);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

type Body = { id: Waypoint; group: Group; mesh: Mesh; radius: number; orbit: number; speed: number; angle: number; spin: number; extra?: Mesh };

const layout: { id: Waypoint; radius: number; orbit: number; speed: number; angle: number; spin: number; tilt: number; atmo?: string }[] = [
  { id: 'sun', radius: 2.2, orbit: 0, speed: 0, angle: 0, spin: 0.03, tilt: 0 },
  { id: 'earth', radius: 0.55, orbit: 7, speed: 0.05, angle: 0.4, spin: 0.25, tilt: 0.41, atmo: '#6cc9ff' },
  { id: 'mars', radius: 0.42, orbit: 9.6, speed: 0.04, angle: 2.4, spin: 0.22, tilt: 0.44, atmo: '#ff9a6b' },
  { id: 'jupiter', radius: 1.3, orbit: 14, speed: 0.024, angle: 4.1, spin: 0.35, tilt: 0.05 },
  { id: 'saturn', radius: 1.08, orbit: 18.5, speed: 0.017, angle: 5.5, spin: 0.3, tilt: 0.47 },
];

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Build the solar system. Painting the maps takes a moment, so it yields between bodies. */
export async function buildSolar() {
  const group = new Group();
  group.visible = false;
  const bodies: Body[] = [];

  for (const spec of layout) {
    const map = painters[spec.id]();
    await tick();
    const holder = new Group();
    const material = spec.id === 'sun'
      ? new MeshBasicMaterial({ map, toneMapped: false })
      : new MeshStandardMaterial({ map, roughness: spec.id === 'earth' ? 0.7 : 0.95, metalness: 0 });
    const mesh = new Mesh(new SphereGeometry(spec.radius, 64, 32), material);
    mesh.rotation.z = spec.tilt;
    holder.add(mesh);
    const body: Body = { id: spec.id, group: holder, mesh, radius: spec.radius, orbit: spec.orbit, speed: spec.speed, angle: spec.angle, spin: spec.spin };
    if (spec.id === 'sun') {
      holder.add(glow('#ffd27a', spec.radius * 3.2, 0.9), glow('#ffb347', spec.radius * 6, 0.35), glow('#ff8a3a', spec.radius * 12, 0.14));
    }
    if (spec.atmo) holder.add(glow(spec.atmo, spec.radius * 3, 0.32));
    if (spec.id === 'earth') {
      const clouds = new Mesh(new SphereGeometry(spec.radius * 1.025, 64, 32), new MeshStandardMaterial({ map: cloudMap(), transparent: true, depthWrite: false, roughness: 1 }));
      clouds.rotation.z = spec.tilt;
      holder.add(clouds);
      body.extra = clouds;
      await tick();
    }
    if (spec.id === 'saturn') {
      const inner = spec.radius * 1.3, outer = spec.radius * 2.35;
      const geo = new RingGeometry(inner, outer, 128, 1);
      // Map u across the ring's width so the band texture runs from the inner to the outer edge.
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - inner) / (outer - inner), 0.5);
      const ring = new Mesh(geo, new MeshStandardMaterial({ map: ringMap(), transparent: true, side: DoubleSide, depthWrite: false, roughness: 1 }));
      ring.rotation.x = -Math.PI / 2 + 0.12;
      ring.rotation.y = spec.tilt * 0.6;
      holder.add(ring);
    }
    if (spec.orbit) {
      const pts: number[] = [];
      for (let i = 0; i < 180; i++) { const a = (i / 180) * Math.PI * 2; pts.push(Math.cos(a) * spec.orbit, 0, Math.sin(a) * spec.orbit); }
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(pts, 3));
      group.add(new LineLoop(geo, new LineBasicMaterial({ color: '#3ff3dc', transparent: true, opacity: 0.14 })));
    }
    group.add(holder);
    bodies.push(body);
  }

  // Asteroid belt between Mars and Jupiter: one instanced mesh.
  const rocks = new InstancedMesh(new DodecahedronGeometry(0.06, 0), new MeshStandardMaterial({ color: '#8b8f99', roughness: 1 }), 420);
  const m = new Matrix4(), q = new Quaternion(), s = new Vector3(), p = new Vector3(), e = new Object3D();
  for (let i = 0; i < rocks.count; i++) {
    const a = Math.random() * Math.PI * 2, r = 11.2 + Math.random() * 1.6;
    p.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.4, Math.sin(a) * r);
    e.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    q.setFromEuler(e.rotation);
    s.setScalar(0.4 + Math.random() * 1.4);
    rocks.setMatrixAt(i, m.compose(p, q, s));
  }
  group.add(rocks);

  // Distant stars on a sphere: they turn with the camera, unlike the page's 2D starfield.
  const starPos: number[] = [];
  for (let i = 0; i < 1800; i++) {
    const v = new Vector3().randomDirection().multiplyScalar(140 + Math.random() * 120);
    starPos.push(v.x, v.y, v.z);
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new Float32BufferAttribute(starPos, 3));
  group.add(new Points(starGeo, new PointsMaterial({ color: '#dfeaff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false })));

  const camera = new PerspectiveCamera(42, 1, 0.1, 600);
  const byId = Object.fromEntries(bodies.map((b) => [b.id, b])) as Record<Waypoint, Body>;

  // ---- camera rig: drag to orbit, wheel or pinch to zoom; drifts round slowly when left alone
  let az = 0.9, el = 0.32, dist = 4.6, distTo = 4.6;
  let idleFor = 10;
  const focus = new Vector3();

  // ---- flight state
  const robotPos = new Vector3(8, 0.6, 0);
  const heading = new Quaternion();
  let at: Body = byId.earth;
  let travel: { from: Vector3; to: Body; t: number; duration: number } | null = null;
  let orbitAngle = 0;
  let cruise = 0;
  const look = new Matrix4();
  const up = new Vector3(0, 1, 0);
  const prev = new Vector3();
  const tmp = new Vector3(), ctrl = new Vector3(), end = new Vector3(), a1 = new Vector3(), a2 = new Vector3();

  const orbitRadius = (b: Body) => b.radius * (b.id === 'saturn' ? 2.6 : 1.7) + 0.7;
  const orbitPoint = (b: Body, angle: number, out: Vector3) => {
    const r = orbitRadius(b);
    return out.set(Math.cos(angle) * r, Math.sin(angle * 0.5) * 0.25 * r * 0.4 + 0.25, Math.sin(angle) * r).add(b.group.position);
  };

  let onArrive: (id: Waypoint) => void = () => {};

  function flyTo(id: Waypoint) {
    const to = byId[id];
    if (!travel && to === at) { onArrive(id); return; }
    // Enter the destination's orbit on the side facing ARIS-1.
    const dir = tmp.subVectors(robotPos, to.group.position);
    orbitAngle = Math.atan2(dir.z, dir.x);
    const d = robotPos.distanceTo(to.group.position);
    travel = { from: robotPos.clone(), to, t: 0, duration: Math.min(4.2, 1.6 + d * 0.11) };
  }

  function update(dt: number, robot: Object3D) {
    for (const b of bodies) {
      b.angle += b.speed * dt;
      if (b.orbit) b.group.position.set(Math.cos(b.angle) * b.orbit, 0, Math.sin(b.angle) * b.orbit);
      b.mesh.rotation.y += b.spin * dt;
      if (b.extra) b.extra.rotation.y += b.spin * 1.25 * dt;
    }
    rocks.rotation.y += dt * 0.01;

    prev.copy(robotPos);
    if (travel) {
      travel.t = Math.min(1, travel.t + dt / travel.duration);
      const s = travel.t < 0.5 ? 4 * travel.t ** 3 : 1 - (-2 * travel.t + 2) ** 3 / 2;
      orbitPoint(travel.to, orbitAngle, end);
      // Arc over the plane of the system: the control point rises with the distance.
      ctrl.addVectors(travel.from, end).multiplyScalar(0.5);
      ctrl.y += travel.from.distanceTo(end) * 0.35 + 1;
      a1.lerpVectors(travel.from, ctrl, s);
      a2.lerpVectors(ctrl, end, s);
      robotPos.lerpVectors(a1, a2, s);
      cruise = Math.sin(travel.t * Math.PI);
      if (travel.t >= 1) {
        at = travel.to;
        travel = null;
        onArrive(at.id);
      }
    } else {
      orbitAngle += dt * (0.55 / Math.max(1, orbitRadius(at) * 0.6));
      orbitPoint(at, orbitAngle, robotPos);
      cruise = 0.25;
    }
    // Face the direction of travel: Matrix4.lookAt points +z from `prev` to the new position,
    // and ARIS-1 faces +z.
    const moved = tmp.subVectors(robotPos, prev);
    if (moved.lengthSq() > 1e-8) {
      look.lookAt(robotPos, prev, up);
      heading.setFromRotationMatrix(look);
    }
    robot.position.copy(robotPos);
    robot.quaternion.slerp(heading, 1 - Math.exp(-dt * 6));

    // Camera follows ARIS-1.
    idleFor += dt;
    if (idleFor > 4) az += dt * 0.05;
    dist += (distTo - dist) * (1 - Math.exp(-dt * 5));
    focus.lerp(robotPos, 1 - Math.exp(-dt * 3));
    camera.position.set(
      focus.x + Math.cos(el) * Math.sin(az) * dist,
      focus.y + Math.sin(el) * dist,
      focus.z + Math.cos(el) * Math.cos(az) * dist,
    );
    camera.lookAt(focus);
  }

  // ---- input on the canvas
  const raycaster = new Raycaster();
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0, downAt = { x: 0, y: 0 }, dragged = false;
  function bind(surface: HTMLElement) {
    const onDown = (e: PointerEvent) => {
      surface.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      downAt = { x: e.clientX, y: e.clientY };
      dragged = false;
      if (pointers.size === 2) { const [p1, p2] = [...pointers.values()]; pinch = Math.hypot(p1.x - p2.x, p1.y - p2.y); }
    };
    const onMove = (e: PointerEvent) => {
      const last = pointers.get(e.pointerId);
      if (!last) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) dragged = true;
      idleFor = 0;
      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (pinch) distTo = Math.min(60, Math.max(3, distTo * (pinch / d)));
        pinch = d;
      } else {
        az -= dx * 0.006;
        el = Math.min(1.35, Math.max(-0.25, el + dy * 0.005));
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (!dragged && pointers.size === 0) pick(e, surface);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      idleFor = 0;
      distTo = Math.min(60, Math.max(3, distTo * (1 + Math.sign(e.deltaY) * Math.min(0.25, Math.abs(e.deltaY) * 0.0015))));
    };
    surface.addEventListener('pointerdown', onDown);
    surface.addEventListener('pointermove', onMove);
    surface.addEventListener('pointerup', onUp);
    surface.addEventListener('pointercancel', onUp);
    surface.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      surface.removeEventListener('pointerdown', onDown);
      surface.removeEventListener('pointermove', onMove);
      surface.removeEventListener('pointerup', onUp);
      surface.removeEventListener('pointercancel', onUp);
      surface.removeEventListener('wheel', onWheel);
    };
  }
  // A click (not a drag) on a planet sends ARIS-1 there.
  let onPick: (id: Waypoint) => void = () => {};
  function pick(e: PointerEvent, surface: HTMLElement) {
    const r = surface.getBoundingClientRect();
    raycaster.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = raycaster.intersectObjects(bodies.map((b) => b.mesh), false)[0];
    const body = hit && bodies.find((b) => b.mesh === hit.object);
    if (body) onPick(body.id);
  }

  /** Screen position (px) above each body for its label, or null when it is behind the camera. */
  const projected = new Vector3();
  function labels(width: number, height: number) {
    return bodies.map((b) => {
      projected.copy(b.group.position);
      projected.y += b.radius * 1.15;
      projected.project(camera);
      const visible = projected.z < 1 && Math.abs(projected.x) < 1.2 && Math.abs(projected.y) < 1.2;
      return { id: b.id, x: (projected.x + 1) / 2 * width, y: (1 - projected.y) / 2 * height, visible };
    });
  }

  return {
    group, camera, bodies, update, flyTo, bind, labels,
    get target() { return travel ? travel.to.id : at.id; },
    get travelling() { return !!travel; },
    get cruise() { return cruise; },
    /** Distance to the current target in scene units, and the robot's position. */
    get distance() { return (travel ? travel.to : at).group.position.distanceTo(robotPos); },
    get position() { return robotPos; },
    set onArrive(fn: (id: Waypoint) => void) { onArrive = fn; },
    set onPick(fn: (id: Waypoint) => void) { onPick = fn; },
    /** Start from the current spot, orbiting Earth, with the camera close in. */
    reset() {
      at = byId.earth;
      travel = null;
      orbitAngle = 0.6;
      orbitPoint(at, orbitAngle, robotPos);
      focus.copy(robotPos);
      az = 0.9; el = 0.32; dist = distTo = 4.6; idleFor = 10;
    },
  };
}

export type Solar = Awaited<ReturnType<typeof buildSolar>>;

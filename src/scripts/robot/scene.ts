// A small photo studio for Byte: physically based light, soft shadows, and a governor that
// trades resolution for frame rate so slow devices stay smooth.
import {
  CanvasTexture, Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, NeutralToneMapping,
  PCFShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Scene, SRGBColorSpace, Timer, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Soft round shadow baked into a tiny texture: cheaper than a shadow map and never aliased.
function contactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

export class SoftwareRenderer extends Error {}

export function createStage(canvas: HTMLCanvasElement, { allowSoftware = false } = {}) {
  // Ask for the context ourselves so a missing WebGL fails quietly (Three.js would log errors).
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'high-performance' });
  if (!context) throw new Error('WebGL2 unavailable');
  const coarse = matchMedia('(pointer: coarse)').matches;
  // A software rasteriser (VMs, blocklisted drivers) cannot run physically based shading smoothly;
  // the HD poster looks better there, so the caller keeps it instead.
  const info = context.getExtension('WEBGL_debug_renderer_info');
  const gpu = info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu);
  if (software && !allowSoftware) throw new SoftwareRenderer(gpu);
  const maxDpr = software ? 1 : Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  let dpr = maxDpr;

  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = SRGBColorSpace;
  // Khronos PBR Neutral keeps the brand colours saturated instead of washing them out.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !coarse && !software;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  // Studio reflections without downloading an HDR: a procedural room, prefiltered once.
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  pmrem.dispose();

  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.35, 10.4);
  camera.lookAt(0, 0.15, 0);

  const key = new DirectionalLight('#fff4e6', 2.4);
  key.position.set(3.5, 6, 6);
  key.castShadow = renderer.shadowMap.enabled;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.04;
  key.shadow.radius = 3;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3.2, bottom: -3, near: 1, far: 20 });
  scene.add(key);
  // Rim light from behind: its colour follows the section being read.
  const rim = new DirectionalLight('#5bc0ff', 2.2);
  rim.position.set(-5, 3.5, -5);
  scene.add(rim);
  scene.add(new HemisphereLight('#ffffff', '#cdeedd', 0.45));

  const contact = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ map: contactShadowTexture(), color: '#13293d', transparent: true, opacity: 0.3, depthWrite: false }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = -2.35;
  contact.scale.setScalar(3.1);
  scene.add(contact);

  const timer = new Timer();
  let frame = 0;
  let running = false;
  let onFrame: (dt: number) => void = () => {};
  let size = { w: 1, h: 1 };

  // Quality governor: if frames run long for a while, lower the resolution, then drop shadows.
  let slow = 0;
  let settle = 2; // seconds to ignore at start (shader compiles, boot-up)
  const govern = (dt: number) => {
    if (settle > 0) { settle -= dt; return; }
    slow = dt > 1 / 40 ? slow + dt : Math.max(0, slow - dt * 0.5);
    if (slow < 1.2) return;
    slow = 0;
    settle = 1;
    if (dpr > 1) {
      dpr = Math.max(1, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      renderer.setSize(size.w, size.h, false);
    } else if (renderer.shadowMap.enabled) {
      renderer.shadowMap.enabled = false;
      key.castShadow = false;
      scene.traverse((o) => { if ((o as Mesh).isMesh) ((o as Mesh).material as { needsUpdate: boolean }).needsUpdate = true; });
    }
  };

  const loop = (time: number) => {
    timer.update(time);
    const raw = timer.getDelta();
    govern(raw);
    // Clamp so a long pause (tab switch) does not teleport the animation.
    onFrame(Math.min(raw, 1 / 20));
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  };

  const rimTarget = new Color('#5bc0ff');

  return {
    renderer, scene, camera, contact, key, rim,
    shadows: () => renderer.shadowMap.enabled,
    setFrame(fn: (dt: number) => void) { onFrame = fn; },
    /** Ease the rim light toward a new colour (called every frame by the behaviours). */
    tintRim(dt: number) { rim.color.lerp(rimTarget, 1 - Math.exp(-dt * 3)); },
    setRim(hex: string) { rimTarget.set(hex); },
    resize(width: number, height: number) {
      size = { w: width, h: height };
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    start() {
      if (running) return;
      running = true;
      timer.reset();
      frame = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
  };
}

export type Stage = ReturnType<typeof createStage>;

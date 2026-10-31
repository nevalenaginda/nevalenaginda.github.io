// ARIS-1's renderer: physically based light in deep space, procedural reflections, and a governor
// that trades resolution, then shadows, for frame rate so slow devices stay smooth.
import {
  DirectionalLight, HemisphereLight, type Mesh, PCFShadowMap, PerspectiveCamera,
  NeutralToneMapping, PMREMGenerator, PointLight, Scene, SRGBColorSpace, Timer, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export class SoftwareRenderer extends Error {}

export function createStage(canvas: HTMLCanvasElement, { allowSoftware = false } = {}) {
  // Ask for the context ourselves so a missing WebGL fails quietly (Three.js would log errors).
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'high-performance' });
  if (!context) throw new Error('WebGL2 unavailable');
  const coarse = matchMedia('(pointer: coarse)').matches;
  // A software rasteriser (VMs, blocklisted drivers) cannot run physically based shading smoothly;
  // the poster looks better there, so the caller keeps it instead.
  const info = context.getExtension('WEBGL_debug_renderer_info');
  const gpu = info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu);
  if (software && !allowSoftware) throw new SoftwareRenderer(gpu);
  const maxDpr = software ? 1 : Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  let dpr = maxDpr;

  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  // Khronos PBR Neutral keeps the teal lights teal instead of bleaching them white.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = !coarse && !software;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  // Reflections for the metal without downloading an HDR: a procedural room, prefiltered once.
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  // Portrait camera for ARIS-1's canvas box.
  const camera = new PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, 0.05, 12);

  const key = new DirectionalLight('#f4f8ff', 2.8);
  key.position.set(4, 6, 7);
  key.castShadow = renderer.shadowMap.enabled;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 });
  scene.add(key);
  // Rim light from behind, in the visor's teal: the robot's outline against space.
  const rim = new DirectionalLight('#5be7ff', 3.2);
  rim.position.set(-6, 3, -6);
  scene.add(rim);
  const rim2 = new DirectionalLight('#a995ff', 1.4);
  rim2.position.set(6, -2, -5);
  scene.add(rim2);
  scene.add(new HemisphereLight('#9fc4ff', '#0a1020', 0.55));
  // The sun for solar flight mode. It exists from the start (dark) so entering that mode does not
  // change the light count and recompile every shader.
  const sun = new PointLight('#fff1d6', 0, 0, 0);
  scene.add(sun);

  const timer = new Timer();
  let frame = 0;
  let running = false;
  let onFrame: (dt: number) => void = () => {};
  let active = camera;
  let size = { w: 1, h: 1 };
  let fps = 60;

  // Quality governor: if frames run long for a while, lower the resolution, then drop shadows.
  let slow = 0;
  let settle = 2; // seconds to ignore at start (shader compiles, boot-up)
  const govern = (dt: number) => {
    fps += (1 / Math.max(dt, 1 / 240) - fps) * 0.05;
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
    renderer.render(scene, active);
    frame = requestAnimationFrame(loop);
  };

  return {
    renderer, scene, camera, key, rim, sun,
    get fps() { return fps; },
    get size() { return size; },
    setFrame(fn: (dt: number) => void) { onFrame = fn; },
    /** Render one frame now through the active camera. */
    render() { renderer.render(scene, active); },
    /** Render through another camera (solar flight mode), or back to the portrait camera. */
    use(cam: PerspectiveCamera = camera) {
      active = cam;
      cam.aspect = size.w / size.h;
      cam.updateProjectionMatrix();
    },
    resize(width: number, height: number) {
      size = { w: Math.max(1, width), h: Math.max(1, height) };
      renderer.setSize(size.w, size.h, false);
      active.aspect = size.w / size.h;
      active.updateProjectionMatrix();
      if (active !== camera) { camera.aspect = active.aspect; camera.updateProjectionMatrix(); }
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

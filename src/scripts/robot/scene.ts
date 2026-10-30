// Renderer, camera, lights and a render loop that only runs while someone can see it.
import { DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, Timer, WebGLRenderer } from 'three';

export function createStage(canvas: HTMLCanvasElement) {
  // Ask for the context ourselves so a missing WebGL fails quietly (Three.js would log errors).
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!context) throw new Error('WebGL2 unavailable');
  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.3, 9.2);

  scene.add(new HemisphereLight('#fff8f0', '#c4b5fd', 2.2));
  const key = new DirectionalLight('#ffffff', 2.4);
  key.position.set(3, 5, 6);
  scene.add(key);

  const timer = new Timer();
  let frame = 0;
  let running = false;
  let onFrame: (dt: number) => void = () => {};

  const loop = (time: number) => {
    timer.update(time);
    // Clamp so a long pause (tab switch) does not teleport the animation.
    onFrame(Math.min(timer.getDelta(), 1 / 20));
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  };

  return {
    renderer, scene, camera,
    setFrame(fn: (dt: number) => void) { onFrame = fn; },
    resize(width: number, height: number) {
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

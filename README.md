# Nevalen Aginda Prasetyo — Portfolio

Astro portfolio for GitHub Pages. Content lives in `src/content/projects/` as Markdown and in `src/data/site.ts`. Astro renders Markdown with Shiki build-time syntax highlighting.

The home page is guided by ARIS-1, an astronaut robot built in Three.js from primitives (no model files):

- `src/scripts/aris/controller.ts` runs without WebGL: HUD telemetry, scan targets (`data-scan` cards), inspection controls, narration, and the flight-mode switch. It loads the 3D layer lazily.
- `src/scripts/aris/webgl/` is the 3D layer: the robot, its animation, the laser scanner, and solar flight mode.
- `src/scripts/aris/audio.ts` holds the voice (Web Speech synthesis) and sound effects (Web Audio, no audio files). Both start switched off.
- The contact terminal (`terminal.ts`) hands the message to the visitor's mail app; the site has no backend.

With reduced motion, data saver, or no WebGL 2, ARIS-1 stays a pre-rendered still and solar flight is off.

## Local setup

```bash
npm install
npm run dev
```

## Verify and build

```bash
npm run build
```

Build regenerates `public/og.png`, then runs Astro type checking, static generation, and `scripts/verify.mjs`. Verification rejects Bootstrap/jQuery references in source, keeps Three.js out of every eagerly loaded script, and checks generated internal links and anchors.

After changing the robot, re-render its still (`public/aris/poster-*.webp`) with `npm run poster` (needs Playwright's Chromium).

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`. Workflow builds the site and deploys `dist/` using GitHub Pages Actions. `astro.config.mjs` sets the GitHub Pages root site URL and no `base`, matching `nevalenaginda.github.io` root deployment.

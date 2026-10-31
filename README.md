# Nevalen Aginda Prasetyo — Portfolio

Astro portfolio for GitHub Pages. Content lives in `src/content/projects/` as Markdown and in `src/data/site.ts`. Astro renders Markdown with Shiki build-time syntax highlighting.

The home page is guided by ARIS-1, an astronaut robot built in Three.js from primitives (no model files):

- `src/scripts/aris/controller.ts` directs the home page: HUD telemetry, inspection controls, "scan all specs", and the flight-mode switch.
- `src/scripts/aris/brief.ts` directs the case studies: ARIS-1 docks in the reading guide, sweeps the screenshot, locks on to each part as it is read, scans trade-offs, and reads parts aloud on request.
- Shared by both: `boot.ts` (when the 3D layer may load), `targets.ts` (`data-scan` elements), `narration.ts`, `read-buttons.ts` (speaker buttons), `speech.ts` (the voice: a queue that speaks sentence by sentence and tells callers when it is done), and `audio.ts` (the voice toggle and Web Audio sound effects, no audio files; both start switched off).
- The voice works the same on every page. Off: ARIS-1 never speaks by itself, and speaker buttons read on request. On: ARIS-1 reads in full whatever you engage with (a scanned card, "Scan all specs", a solar destination, the case-study part you stop on). Hover never speaks; Escape stops speech. Browsers allow speech only after a click on the page, so a case study opened with the voice on asks for one.
- `src/scripts/aris/webgl/` is the 3D layer: the robot, its animation, and the laser scanner. Solar flight mode (`solar.ts`) loads only when the home page enters it.
- `src/lib/brief-sections.mjs` is a Sätteri hast plugin (`markdown.processor` in `astro.config.mjs`) that turns each case-study part into a mission log section at build time. The Markdown stays plain.
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

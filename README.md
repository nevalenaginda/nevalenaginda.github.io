# Nevalen Aginda Prasetyo — Portfolio

Astro portfolio for GitHub Pages. Content lives in `src/content/projects/` as Markdown. Astro renders Markdown with Shiki build-time syntax highlighting.

## Local setup

```bash
npm install
npm run dev
```

## Verify and build

```bash
npm run build
```

Build runs Astro type checking, static generation, and `scripts/verify.mjs`. Verification rejects Bootstrap/jQuery references in source and checks generated internal links.

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`. Workflow builds the site and deploys `dist/` using GitHub Pages Actions. `astro.config.mjs` sets the GitHub Pages root site URL and no `base`, matching `nevalenaginda.github.io` root deployment.
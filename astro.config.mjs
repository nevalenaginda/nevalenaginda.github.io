import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://nevalenaginda.github.io',
  integrations: [],
  // The lazy Three.js chunk for the hero robot is ~600 kB raw (~150 kB gzip) by design.
  vite: { plugins: [tailwindcss()], build: { chunkSizeWarningLimit: 700 } },
});

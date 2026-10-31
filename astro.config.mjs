import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import tailwindcss from '@tailwindcss/vite';
import { briefSections } from './src/lib/brief-sections.mjs';

export default defineConfig({
  site: 'https://nevalenaginda.github.io',
  integrations: [],
  // Case studies become mission log sections at build time (src/lib/brief-sections.mjs).
  markdown: { processor: satteri({ hastPlugins: [briefSections] }) },
  // The lazy Three.js chunk for ARIS-1 is ~600 kB raw (~150 kB gzip) by design.
  vite: { plugins: [tailwindcss()], build: { chunkSizeWarningLimit: 700 } },
});

import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://nevalenaginda.github.io',
  integrations: [],
  vite: { plugins: [tailwindcss()] },
});

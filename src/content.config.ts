import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    company: z.string(),
    role: z.string(),
    released: z.string(),
    summary: z.string(),
    image: z.string(),
    imageAlt: z.string(),
    reference: z.url(),
    referenceLabel: z.string(),
    // App store listings for the app this project ships in.
    stores: z.array(z.object({ store: z.enum(['Google Play', 'App Store']), url: z.url() })).default([]),
    order: z.number(),
  }),
});

export const collections = { projects };

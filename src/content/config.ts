import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    company: z.string(),
    role: z.string(),
    released: z.string(),
    summary: z.string(),
    reference: z.string().url(),
    referenceLabel: z.string(),
    order: z.number(),
  }),
});

const writing = defineCollection({
  type: 'content',
  schema: z.object({ title: z.string(), published: z.date() }),
});

export const collections = { projects, writing };

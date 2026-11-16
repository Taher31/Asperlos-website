import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Slugs and terms follow the glossary in docs/brand-guide.md (section 10).
export const categories = ['pulses', 'dried-fruit'] as const;
export const origins = ['russia', 'uzbekistan'] as const;
export const availability = ['in-stock', 'seasonal', 'on-request'] as const;
export const certificates = ['phytosanitary', 'origin', 'quality'] as const;

// One file per product per language: src/content/products/{en,fa,ru}/<slug>.md
const products = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/products' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      category: z.enum(categories),
      origin: z.enum(origins),
      order: z.number(),
      featured: z.boolean().default(false),
      summary: z.string(),
      // Omit until confirmed; the page then shows a placeholder and the publish check fails.
      availability: z.enum(availability).optional(),
      packaging: z.array(z.string()).optional(),
      moq: z.string().optional(),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      certificates: z.array(z.enum(certificates)).default([]),
      image: image().optional(),
      imageAlt: z.string().optional(),
    }),
});

// One file per origin country per language: src/content/origins/{en,fa,ru}/<origin>.md
const originPages = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/origins' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    regions: z.string(),
  }),
});

export const journalCategories = ['data', 'education', 'history', 'analysis'] as const;

const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    category: z.enum(journalCategories),
    date: z.coerce.date(),
    sources: z.array(z.object({
      label: z.string().min(1),
      url: z.url().startsWith('https://'),
    })).default([]),
    linkedinUrl: z.url().regex(/^https:\/\/(www\.)?linkedin\.com\//).optional(),
    linkedinEmbedUrl: z.url().regex(/^https:\/\/www\.linkedin\.com\/embed\/feed\/update\//).optional(),
    image: z.string().regex(/^[a-z0-9][a-z0-9-]*\.(?:jpe?g|png|webp)$/).optional(),
    video: z.string().regex(/^[a-z0-9][a-z0-9-]*\.(?:mp4|webm)$/).optional(),
    mediaAlt: z.string().optional(),
  }),
});

export const collections = { products, origins: originPages, journal };

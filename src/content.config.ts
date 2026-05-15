import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articleSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().optional(),
  tags: z.array(z.string()).default([]),
  author: z.string().default('ArcSign Team'),
  locale: z.enum(['zh-TW', 'en']),
  ogImage: z.string().optional(),
  noindex: z.boolean().default(false),
  relatedSlugs: z.array(z.string()).default([]),
});

const blogZh = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/blog/zh-TW' }),
  schema: articleSchema,
});

const blogEn = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/blog/en' }),
  schema: articleSchema,
});

export const collections = { blogZh, blogEn };

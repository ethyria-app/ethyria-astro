import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const variantSchema = z.object({
  title: z.string(),
  description: z.string(),
  related: z.array(z.string()),
});

const faqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const collections = {
  symbols: defineCollection({
    loader: glob({ pattern: '*.json', base: './src/content/symbols' }),
    schema: z.object({
      urlSlug: z.string(),
      title: z.string(),
      description: z.string(),
      keywords: z.string(),
      datePublished: z.string(),
      dateModified: z.string(),
      heroImage: z.string(),
      heroAlt: z.string(),
      freud: z.string(),
      jung: z.string(),
      spiritual: z.string(),
      biosync: z.string(),
      communityStats: z.object({
        percent: z.number(),
        companion: z.string(),
        total: z.number(),
      }),
      variants: z.array(variantSchema).min(1),
      faq: z.array(faqItemSchema).min(1),
    }),
  }),

  pillars: defineCollection({
    loader: glob({ pattern: '*/*.mdx', base: './src/content/pillars' }),
    schema: z.object({
      slug: z.string(),
      title: z.string(),
      description: z.string(),
      keywords: z.string(),
      datePublished: z.string(),
      dateModified: z.string(),
      breadcrumbLabel: z.string(),
      faq: z.array(faqItemSchema),
      speakableSelectors: z.array(z.string()).optional(),
      ogImage: z.string().optional(),
    }),
  }),

  home: defineCollection({
    loader: glob({ pattern: '*.json', base: './src/content/home' }),
    schema: z.object({
      lang: z.string(),
      meta: z.object({
        title: z.string(),
        description: z.string(),
        keywords: z.string(),
        ogImage: z.string().optional(),
      }),
      hero: z.object({
        badge: z.string(),
        h1: z.string(),
        h2: z.string(),
        cta: z.string(),
        rating_text: z.string(),
        rating_count: z.string(),
      }),
      faq: z.array(faqItemSchema),
    }),
  }),
};

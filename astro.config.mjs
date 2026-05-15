// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'static',

  // i18n routing
  i18n: {
    defaultLocale: 'zh-TW',
    locales: ['zh-TW', 'en'],
    routing: {
      prefixDefaultLocale: false, // zh-TW at /, en at /en/
    },
  },

  // Build settings
  build: {
    format: 'file', // output /blog/article.html (not /blog/article/index.html)
  },

  // Site URL
  site: 'https://arcsign.io',

  // Auto-generate sitemap.xml + sitemap-index.xml
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'zh-TW',
        locales: {
          'zh-TW': 'zh-TW',
          'en': 'en',
        },
      },
    }),
  ],
});

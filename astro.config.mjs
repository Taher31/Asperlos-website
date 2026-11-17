// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import { journalFigures } from './src/lib/journal-figures.mjs';

// Canonical origin for pages, metadata and sitemap URLs.
const SITE = 'https://asperlos.ir';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    processor: satteri({ hastPlugins: [journalFigures] }),
  },
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      // English is served from the root, Persian and Russian from /fa/ and /ru/.
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', fa: 'fa-IR', ru: 'ru' },
      },
      filter: (page) => !page.includes('/inquiry/sent/'),
    }),
  ],
});

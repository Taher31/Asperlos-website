// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The domain is temporary (ADR-0001, R6). Change it here only; never hard-code absolute URLs elsewhere.
const SITE = 'https://esperlos.sbs';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
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

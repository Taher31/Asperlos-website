// robots.txt built from the configured site URL, so the domain lives only in astro.config.mjs.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });

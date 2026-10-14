// Product list for public/api/inquiry.php: the allowed slugs and their names in each language.
import type { APIRoute } from 'astro';
import { getProducts, slugOf } from '../../lib/content';
import { languages } from '../../i18n';

export const GET: APIRoute = async () => {
  const products: Record<string, Record<string, string>> = {};
  for (const lang of languages) {
    for (const p of await getProducts(lang)) {
      (products[slugOf(p)] ??= {})[lang] = p.data.title;
    }
  }
  return new Response(JSON.stringify(products), { headers: { 'Content-Type': 'application/json' } });
};

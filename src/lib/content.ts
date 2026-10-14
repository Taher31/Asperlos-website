import { getCollection, type CollectionEntry } from 'astro:content';
import { languages, type Lang } from '../i18n';
import { categories } from '../content.config';

export type Product = CollectionEntry<'products'>;
export type OriginPage = CollectionEntry<'origins'>;

/** Entry ids look like "fa/red-lentils"; the slug is shared by all three languages. */
export const slugOf = (entry: { id: string }) => entry.id.split('/').slice(1).join('/');
const langOf = (entry: { id: string }) => entry.id.split('/')[0] as Lang;

// Every product and origin page must exist in all three languages with the same category/origin.
async function checkComplete() {
  const all = await getCollection('products');
  const bySlug = new Map<string, Product[]>();
  for (const p of all) bySlug.set(slugOf(p), [...(bySlug.get(slugOf(p)) ?? []), p]);
  for (const [slug, entries] of bySlug) {
    const missing = languages.filter((l) => !entries.some((e) => langOf(e) === l));
    if (missing.length) throw new Error(`Product "${slug}" is missing translations: ${missing.join(', ')}`);
    const keys = new Set(entries.map((e) => `${e.data.category}/${e.data.origin}/${e.data.order}`));
    if (keys.size > 1) throw new Error(`Product "${slug}" has different category/origin/order between languages`);
  }
  const origins = await getCollection('origins');
  for (const slug of new Set(origins.map(slugOf))) {
    const missing = languages.filter((l) => !origins.some((o) => slugOf(o) === slug && langOf(o) === l));
    if (missing.length) throw new Error(`Origin page "${slug}" is missing translations: ${missing.join(', ')}`);
  }
}
const ready = checkComplete();

export async function getProducts(lang: Lang): Promise<Product[]> {
  await ready;
  const list = await getCollection('products', (p) => langOf(p) === lang);
  return list.sort(
    (a, b) => categories.indexOf(a.data.category) - categories.indexOf(b.data.category) || a.data.order - b.data.order,
  );
}

export async function getOriginPages(lang: Lang): Promise<OriginPage[]> {
  await ready;
  return getCollection('origins', (o) => langOf(o) === lang);
}

export function groupByCategory(products: Product[]) {
  return categories
    .map((category) => ({ category, items: products.filter((p) => p.data.category === category) }))
    .filter((g) => g.items.length > 0);
}

export const productPath = (p: Product) => `/products/${p.data.category}/${slugOf(p)}/`;

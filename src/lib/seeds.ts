// Seed illustrations rendered by docs/design/art/seeds.py: src/assets/seeds/<product slug>-<1..4>.png
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/seeds/*.png', { eager: true });
const bySlug = new Map<string, ImageMetadata[]>();
for (const [path, mod] of Object.entries(files)) {
  const [, slug, n] = path.match(/\/([a-z-]+)-(\d+)\.png$/)!;
  const list = bySlug.get(slug) ?? [];
  list[Number(n) - 1] = mod.default;
  bySlug.set(slug, list);
}

/** Variant `n` (any integer, wraps around) of a product's seed illustration, or undefined if none exists. */
export function seedImage(slug: string, n = 0): ImageMetadata | undefined {
  const list = bySlug.get(slug);
  return list?.length ? list[((n % list.length) + list.length) % list.length] : undefined;
}

export const hasSeeds = (slug: string) => bySlug.has(slug);

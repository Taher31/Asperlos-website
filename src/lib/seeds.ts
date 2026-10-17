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

/** One placement in a composition: position and size as % of the box, rotation in degrees. */
export interface Placement { x: number; y: number; w: number; r: number; depth?: number }

/** Loose cluster used for hero groups and product panels; seeds sit around the box edges, not on the text. */
export const cluster: Placement[] = [
  { x: 8, y: 6, w: 22, r: -12 },
  { x: 66, y: 4, w: 17, r: 18 },
  { x: 72, y: 62, w: 24, r: -6 },
  { x: 4, y: 64, w: 16, r: 24 },
  { x: 40, y: 80, w: 13, r: -30 },
  { x: 42, y: 12, w: 11, r: 40 },
];

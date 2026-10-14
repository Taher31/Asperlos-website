// Finds unconfirmed placeholders in built HTML: [TBD: …], [تکمیل شود: …] or [уточняется: …] (docs/brand-guide.md).
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const MARKER = /\[(TBD|تکمیل شود|уточняется)[^\]]*\]/g;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

/** @returns {Promise<{ total: number, files: { file: string, count: number }[] }>} */
export async function findPlaceholders(root) {
  const files = [];
  for await (const path of htmlFiles(root)) {
    const count = ((await readFile(path, 'utf8')).match(MARKER) ?? []).length;
    if (count) files.push({ file: path.slice(root.length), count });
  }
  return { total: files.reduce((sum, f) => sum + f.count, 0), files };
}

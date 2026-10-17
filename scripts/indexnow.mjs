// Run by the deploy workflow after upload: tells IndexNow search engines (Bing, Yandex, Seznam, Naver…) that the
// site's pages changed, so they recrawl them without a webmaster account. Bing's index also feeds ChatGPT search.
// The key is public by design: IndexNow checks that https://<host>/<key>.txt holds the same key.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');

const keyFile = (await readdir(join(root, 'public'))).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('IndexNow key file (public/<32 hex>.txt) not found');
const key = keyFile.slice(0, -4);

const sitemaps = (await readdir(dist)).filter((f) => /^sitemap-\d+\.xml$/.test(f));
const urlList = [];
for (const f of sitemaps) {
  for (const [, loc] of (await readFile(join(dist, f), 'utf8')).matchAll(/<loc>([^<]+)<\/loc>/g)) urlList.push(loc);
}
if (!urlList.length) throw new Error('No URLs found in dist/sitemap-*.xml');

const { host, origin } = new URL(urlList[0]);
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `${origin}/${keyFile}`, urlList }),
});
console.log(`IndexNow: ${urlList.length} URL(s) for ${host} → HTTP ${res.status}`);
// 200 = accepted, 202 = accepted while the key is being verified (first submission).
if (res.status !== 200 && res.status !== 202) {
  console.error(await res.text());
  process.exit(1);
}

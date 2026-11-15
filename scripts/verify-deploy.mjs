import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import config from '../astro.config.mjs';

const expected = JSON.parse(await readFile(new URL('../dist/version.json', import.meta.url), 'utf8'));
const url = new URL('/version.json', config.site);
url.searchParams.set('deploy', String(expected.deploy));

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const live = await response.json();
    if (live.commit !== expected.commit || live.deploy !== expected.deploy) {
      throw new Error(`served commit ${live.commit} and deploy ${live.deploy}; expected ${expected.commit} and ${expected.deploy}`);
    }
    console.log(`Verified ${live.name} at ${url.origin} (commit ${live.commit})`);
    break;
  } catch (error) {
    const reason = error.cause?.code ?? error.message;
    const message = `Verification attempt ${attempt}: ${url.href} — ${reason}`;
    if (attempt === 3) throw new Error(message, { cause: error });
    console.warn(message);
    await delay(5_000);
  }
}

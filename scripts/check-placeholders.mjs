// Fails if any unconfirmed placeholder would be published (used by the deploy workflow).
import { fileURLToPath } from 'node:url';
import { findPlaceholders } from './placeholders.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const { total, files } = await findPlaceholders(root);

for (const { file, count } of files) console.log(`${file}: ${count}`);
if (total > 0) {
  console.error(`\n${total} placeholder(s) still in the build. Fill them in before publishing.`);
  process.exit(1);
}
console.log('No placeholders found.');

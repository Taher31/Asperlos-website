// Run by the deploy workflow after `npm run build`: writes dist/version.json so the live site shows
// which deploy it is (https://<domain>/version.json). Manual ZIP releases stamp it in release.mjs instead.
import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPlaceholders } from './placeholders.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');

const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const deploy = Number(process.env.GITHUB_RUN_NUMBER) || 0;
const commit = (process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' })).trim().slice(0, 7);
const name = `asperlos-v${version}-deploy.${String(deploy).padStart(3, '0')}`;
const date = new Date().toISOString();
const { total: placeholders } = await findPlaceholders(dist + sep);

await writeFile(join(dist, 'version.json'), JSON.stringify({ name, version, deploy, date, commit, placeholders }, null, 2));
console.log(`version.json: ${name} (commit ${commit}, ${placeholders} placeholder(s))`);

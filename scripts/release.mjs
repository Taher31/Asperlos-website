// npm run release: builds the site with the next build number and packages it for upload.
//
//   releases/asperlos-v<version>-build.<NNN>.zip   contents of dist/ (incl. .htaccess), ready to extract into public_html
//   releases/RELEASES.md                            one line per release
//   dist/version.json                               what is live: https://<domain>/version.json
//
// The version comes from package.json; the build number from release.json (committed, so numbers never repeat).
import { execSync, spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile, stat, appendFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';
import { findPlaceholders } from './placeholders.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const releases = join(root, 'releases');
const counterFile = join(root, 'release.json');

const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const counter = JSON.parse(await readFile(counterFile, 'utf8'));
const build = counter.build + 1;
const name = `asperlos-v${version}-build.${String(build).padStart(3, '0')}`;
const commit = git('rev-parse --short HEAD') || 'none';
const dirty = git('status --porcelain')
  .split('\n')
  .filter((line) => line && !line.endsWith('release.json')).length > 0;

console.log(`\n▶ ${name}  (commit ${commit}${dirty ? ', with uncommitted changes' : ''})\n`);

// 1. Build
const result = spawnSync('npm run build', { cwd: root, stdio: 'inherit', shell: true });
if (result.status !== 0) {
  console.error('\nBuild failed; build number not used.');
  process.exit(result.status ?? 1);
}

// 2. Stamp the build so the live site can be identified
const date = new Date().toISOString();
await writeFile(join(dist, 'version.json'), JSON.stringify({ name, version, build, date, commit, dirty }, null, 2));

// 3. Zip dist/ (dotfiles included)
async function collect(dir, files = {}) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await collect(path, files);
    else files[relative(dist, path).split(sep).join('/')] = new Uint8Array(await readFile(path));
  }
  return files;
}
await mkdir(releases, { recursive: true });
const zipPath = join(releases, `${name}.zip`);
await writeFile(zipPath, zipSync(await collect(dist), { level: 9 }));
const sizeKb = Math.round((await stat(zipPath)).size / 1024);

// 4. Placeholder report (does not block a release, but the site is not publishable while any remain)
const { total } = await findPlaceholders(dist + sep);

// 5. Log and bump the counter
const log = join(releases, 'RELEASES.md');
const exists = await stat(log).then(() => true, () => false);
if (!exists) {
  await writeFile(log, '# Releases\n\n| Build | Version | Date (UTC) | Commit | Placeholders | Size |\n|---|---|---|---|---|---|\n');
}
await appendFile(
  log,
  `| ${build} | ${version} | ${date.slice(0, 16).replace('T', ' ')} | ${commit}${dirty ? '*' : ''} | ${total} | ${sizeKb} KB |\n`,
);
await writeFile(counterFile, JSON.stringify({ build }, null, 2) + '\n');

console.log(`\n✔ releases/${name}.zip  (${sizeKb} KB)`);
console.log(total ? `⚠ ${total} placeholder(s) remain: not ready to publish.` : '✔ No placeholders: ready to publish.');
console.log('  Commit release.json so the next build gets a new number.\n');

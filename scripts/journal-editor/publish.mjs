import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { root } from './content.mjs';

const exec = promisify(execFile);
const repo = 'Taher31/Asperlos-website';
const site = 'https://asperlos.ir';
const allowed = (name) => name.startsWith('src/content/journal/') || name.startsWith('public/journal-media/');
const paths = (raw) => raw.split('\0').filter(Boolean);

async function run(file, ...args) {
  try {
    const { stdout } = await exec(file, args, { cwd: root, windowsHide: true, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    throw new Error((error.stderr?.trim() || error.message).slice(-1500));
  }
}

async function waitForRelease(sha, retry) {
  let runId;
  let restarted = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const [job] = JSON.parse(await run('gh', 'run', 'list', '--repo', repo, '--workflow', 'deploy.yml',
      '--commit', sha, '--branch', 'main', '--limit', '1', '--json', 'status,conclusion,databaseId,number,url'));
    if (job?.status === 'completed') {
      if (job.conclusion !== 'success') {
        if (retry && !restarted) {
          runId = job.databaseId;
          await run('gh', 'run', 'rerun', String(runId), '--repo', repo);
          restarted = true;
          await delay(8000);
          continue;
        }
        throw new Error('انتشار روی هاست ناموفق بود. ' + job.url);
      }
      try {
        const response = await fetch(site + '/version.json?journal=' + sha, { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
        if (response.ok) {
          const version = await response.json();
          if (version.commit === sha.slice(0, 7) && version.deploy === job.number) {
            return { message: 'نسخهٔ تازهٔ مجله روی هاست تأیید شد.', url: job.url };
          }
        }
      } catch {
        // A transient site connection error can resolve while the release settles.
      }
    }
    await delay(4000);
  }
  throw new Error('تأیید نسخهٔ هاست به‌موقع نرسید. وضعیت انتشار را در گیت‌هاب بررسی کنید.');
}

export async function publishJournal() {
  if (await run('git', 'branch', '--show-current') !== 'main') throw new Error('برای انتشار، شاخهٔ main را باز کنید.');
  const origin = await run('git', 'remote', 'get-url', '--push', 'origin');
  if (![ 'https://github.com/' + repo + '.git', 'https://github.com/' + repo, 'git@github.com:' + repo + '.git' ].includes(origin)) {
    throw new Error('مقصد گیت با مخزن سایت اسپرلوس مطابقت ندارد.');
  }
  await run('gh', 'auth', 'status', '--hostname', 'github.com');
  await run('git', 'fetch', '--quiet', 'origin', 'main');
  const remote = await run('git', 'rev-parse', 'FETCH_HEAD');
  if (await run('git', 'merge-base', remote, 'HEAD') !== remote) {
    throw new Error('پوشهٔ محلی با شاخهٔ اصلی همگام نیست. ابتدا تغییرات گیت را همگام کنید.');
  }
  const ahead = await run('git', 'log', '--format=', '--name-only', '-z', remote + '..HEAD');
  const staged = await run('git', 'diff', '--cached', '--name-only', '--no-renames', '-z');
  if ([...paths(ahead), ...paths(staged)].some((name) => !allowed(name.trim()))) {
    throw new Error('تغییرات آمادهٔ انتشار شامل فایل‌هایی بیرون از مجله است.');
  }
  const changed = await run('git', 'status', '--porcelain', '--untracked-files=all', '--', 'src/content/journal', 'public/journal-media');
  if (changed) {
    if (process.platform === 'win32') {
      const npm = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
      await run(process.execPath, npm, 'run', 'build');
    } else {
      await run('npm', 'run', 'build');
    }
    const targets = ['src/content/journal'];
    if (existsSync(join(root, 'public', 'journal-media')) || await run('git', 'ls-files', '--', 'public/journal-media')) {
      targets.push('public/journal-media');
    }
    await run('git', 'add', '-A', '--', ...targets);
    const ready = paths(await run('git', 'diff', '--cached', '--name-only', '--no-renames', '-z'));
    if (ready.some((name) => !allowed(name))) throw new Error('فایل‌هایی بیرون از مجله برای ثبت آماده شده‌اند.');
    if (ready.length) await run('git', 'commit', '-m', 'Update Asperlos trade journal');
  }
  const sha = await run('git', 'rev-parse', 'HEAD');
  if (sha !== remote) await run('git', 'push', 'origin', 'HEAD:refs/heads/main');
  return waitForRelease(sha, sha === remote);
}

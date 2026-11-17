import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import {
  clearPublishedDrafts, incomingMedia, listArticles, listCategories, mediaType,
  readArticle, resolveMedia, root, saveCategory, saveDraft, stageDrafts, validSlug,
} from './content.mjs';
import { browserEditor } from './bundle-editor.mjs';
import { publishJournal } from './publish.mjs';

const port = Number(process.env.JOURNAL_EDITOR_PORT || 4174);
const address = '127.0.0.1';
const host = address + ':' + port;
const origin = 'http://' + host;
const html = await readFile(new URL('./index.html', import.meta.url));
const healthPath = '/api/health';
const instanceHeader = 'X-Asperlos-Journal-Instance';
const instance = createHash('sha256').update(await realpath(root)).digest('hex');
let deployment = { state: 'idle', message: '' };
let saving = 0;
let savingCategory = false;
const MAX_JSON = 2 * 1024 * 1024;
const MAX_MEDIA = 75 * 1024 * 1024;
const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' };

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

async function bytes(request, limit) {
  if (Number(request.headers['content-length']) > limit) throw new Error('اندازهٔ فایل بیشتر از حد مجاز است.');
  let length = 0;
  const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) throw new Error('اندازهٔ فایل بیشتر از حد مجاز است.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function hasMediaSignature(extension, buffer) {
  switch (extension) {
    case '.jpg': return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    case '.png': return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case '.webp': return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    case '.mp4': return buffer.toString('ascii', 4, 8) === 'ftyp';
    case '.webm': return buffer.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
    default: return false;
  }
}

async function saveMedia(request, filename) {
  const extension = extname(filename || '').toLowerCase().replace('.jpeg', '.jpg');
  if (!mediaType('upload' + extension)) throw new Error('برای عکس JPG، PNG یا WebP و برای فیلم MP4 یا WebM انتخاب کنید.');
  const file = await bytes(request, MAX_MEDIA);
  if (!hasMediaSignature(extension, file)) throw new Error('محتوای فایل با نوع انتخاب‌شده مطابقت ندارد.');
  const name = createHash('sha256').update(file).digest('hex').slice(0, 32) + extension;
  await mkdir(incomingMedia, { recursive: true });
  await writeFile(join(incomingMedia, name), file);
  return name;
}

async function sendMedia(request, response, name) {
  const file = await resolveMedia(name);
  if (!file) return json(response, 404, { error: 'فایل پیدا نشد.' });
  const { size } = await stat(file);
  const type = mime[extname(name)];
  const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || '');
  if (range) {
    const start = Number(range[1]);
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      response.writeHead(416, { 'Content-Range': 'bytes */' + size });
      return response.end();
    }
    response.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Range': 'bytes ' + start + '-' + end + '/' + size });
    return createReadStream(file, { start, end }).pipe(response);
  }
  response.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size });
  createReadStream(file).pipe(response);
}

async function startPublishing() {
  deployment = { state: 'running', message: 'پیش‌نویس‌ها بررسی می‌شوند. بعد از ارسال به گیت‌هاب، برنامه منتظر تأیید هاست می‌ماند.' };
  try {
    const drafts = await stageDrafts();
    const result = await publishJournal();
    await clearPublishedDrafts(drafts);
    deployment = { state: 'success', ...result };
  } catch (error) {
    deployment = { state: 'error', message: error.message || 'انتشار کامل نشد.' };
    console.error(error.message);
  }
}

async function handle(request, response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  if (request.headers.host !== host) return json(response, 403, { error: 'پنل فقط از همین رایانه در دسترس است.' });
  const url = new URL(request.url, origin);
  const { pathname } = url;
  if (request.method === 'HEAD' && pathname === healthPath) {
    response.writeHead(204, { [instanceHeader]: instance, 'Cache-Control': 'no-store' });
    return response.end();
  }
  if (request.method === 'GET') {
    if (pathname === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end(html);
    }
    if (pathname === '/editor.mjs') {
      const script = await browserEditor();
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end(script);
    }
    if (pathname === '/editor.css') {
      const css = await readFile(new URL('./editor.css', import.meta.url));
      response.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end(css);
    }
    if (pathname === '/api/articles') return json(response, 200, { articles: await listArticles(), deployment });
    if (pathname === '/api/categories') return json(response, 200, await listCategories());
    if (pathname.startsWith('/media/')) return sendMedia(request, response, pathname.slice(7));
    if (pathname.startsWith('/journal-media/')) return sendMedia(request, response, pathname.slice(15));
    if (pathname.startsWith('/api/articles/')) {
      const article = await readArticle(pathname.slice(14));
      return article ? json(response, 200, article) : json(response, 404, { error: 'مطلب پیدا نشد.' });
    }
  }
  if (request.method === 'POST') {
    if (request.headers.origin !== origin || request.headers['x-journal-editor'] !== '1') {
      return json(response, 403, { error: 'درخواست باید از پنل محلی ارسال شود.' });
    }
    if (deployment.state === 'running') return json(response, 409, { error: 'انتشار قبلی هنوز کامل نشده است.' });
    if (pathname === '/api/publish') {
      await bytes(request, 32 * 1024);
      if (deployment.state === 'running') return json(response, 409, { error: 'انتشار قبلی هنوز کامل نشده است.' });
      if (saving) return json(response, 409, { error: 'ذخیره هنوز در جریان است. کمی بعد دوباره تلاش کنید.' });
      void startPublishing();
      return json(response, 202, deployment);
    }
    if (pathname === '/api/media') return json(response, 201, { name: await saveMedia(request, url.searchParams.get('name')) });
    if (pathname.startsWith('/api/categories/')) {
      const id = pathname.slice(16);
      const input = JSON.parse((await bytes(request, 16 * 1024)).toString('utf8'));
      if (deployment.state === 'running' || savingCategory) {
        return json(response, 409, { error: 'ذخیره یا انتشار در جریان است. دوباره تلاش کنید.' });
      }
      savingCategory = true;
      saving += 1;
      try {
        return json(response, input?.mode === 'create' ? 201 : 200, await saveCategory(id, input));
      } finally {
        savingCategory = false;
        saving -= 1;
      }
    }
    if (pathname.startsWith('/api/articles/')) {
      const slug = pathname.slice(14);
      if (!validSlug(slug)) return json(response, 400, { error: 'شناسهٔ مطلب معتبر نیست.' });
      const content = JSON.parse((await bytes(request, MAX_JSON)).toString('utf8'));
      if (deployment.state === 'running') return json(response, 409, { error: 'انتشار در جریان است. پس از اتمام دوباره ذخیره کنید.' });
      saving += 1;
      try {
        return json(response, 200, { ...await saveDraft(slug, content), draft: true });
      } finally {
        saving -= 1;
      }
    }
  }
  return json(response, 404, { error: 'این مسیر در پنل وجود ندارد.' });
}

function showEditor(message) {
  console.log(message + ': ' + origin);
  if (process.platform === 'win32' && process.argv.includes('--open')) {
    execFile('rundll32.exe', ['url.dll,FileProtocolHandler', origin], { windowsHide: true });
  }
}

async function isSameEditor() {
  try {
    const response = await fetch(origin + healthPath, {
      method: 'HEAD',
      redirect: 'error',
      signal: AbortSignal.timeout(1500),
    });
    return response.status === 204 && response.headers.get(instanceHeader) === instance;
  } catch {
    return false;
  }
}

const server = createServer((request, response) => {
  handle(request, response).catch((error) => {
    if (response.headersSent) return response.destroy();
    json(response, 400, { error: error.message || 'درخواست انجام نشد.' });
  });
});

server.on('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    if (await isSameEditor()) {
      showEditor('Asperlos journal editor is already running');
      return;
    }
    console.error('Port ' + port + ' is already in use. If ' + origin + ' is an older journal editor, close its original terminal once, then reopen the shortcut.');
  } else {
    console.error('Could not start the Asperlos journal editor: ' + error.message);
  }
  process.exitCode = 1;
});
server.listen(port, address, () => showEditor('Asperlos journal editor'));

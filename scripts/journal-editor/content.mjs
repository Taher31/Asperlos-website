import { randomUUID } from 'node:crypto';
import { access, copyFile, mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

export const root = fileURLToPath(new URL('../../', import.meta.url));
const content = join(root, 'src', 'content', 'journal');
const working = join(root, '.journal-editor');
const draftFolder = join(working, 'drafts');
export const incomingMedia = join(working, 'media');
export const publishedMedia = join(root, 'public', 'journal-media');
export const languages = ['fa', 'en', 'ru'];
const categories = ['data', 'education', 'history', 'analysis'];
export const validSlug = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 90;
export const mediaType = (s) => {
  if (/^[a-z0-9][a-z0-9-]*\.(?:jpe?g|png|webp)$/.test(s)) return 'image';
  if (/^[a-z0-9][a-z0-9-]*\.(?:mp4|webm)$/.test(s)) return 'video';
};

async function optional(operation) {
  try { return await operation(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function writeAtomic(filename, body) {
  const temp = filename + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temp, body, 'utf8');
    await rename(temp, filename);
  } finally {
    await optional(() => unlink(temp));
  }
}

const articleFile = (slug, lang) => join(content, ...(lang === 'fa' ? [] : [lang]), slug + '.md');
const draftFile = (slug) => join(draftFolder, slug + '.json');
const fields = ['title', 'summary', 'body', 'mediaAlt'];

function parseMarkdown(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error('Article metadata could not be read.');
  const metadata = parse(match[1]);
  return { ...metadata, body: match[2].trim() };
}

async function liveArticle(slug) {
  const fa = await optional(() => readFile(articleFile(slug, 'fa'), 'utf8'));
  if (!fa) return undefined;
  const original = parseMarkdown(fa);
  const { category, date, sources = [], image, video, linkedinUrl, linkedinEmbedUrl } = original;
  const article = { slug, category, date: String(date), sources, image, video, linkedinUrl, linkedinEmbedUrl, translations: {} };
  for (const lang of languages) {
    const raw = lang === 'fa' ? fa : await optional(() => readFile(articleFile(slug, lang), 'utf8'));
    const data = raw ? parseMarkdown(raw) : {};
    article.translations[lang] = Object.fromEntries(fields.map((key) => [key, data[key] ?? '']));
  }
  return article;
}

export async function readArticle(slug) {
  if (!validSlug(slug)) return undefined;
  const raw = await optional(() => readFile(draftFile(slug), 'utf8'));
  return raw ? { ...JSON.parse(raw), draft: true } : liveArticle(slug);
}

function names(files, extension) {
  return (files ?? []).filter((file) => file.endsWith(extension))
    .map((file) => file.slice(0, -extension.length)).filter(validSlug);
}

export async function listArticles() {
  const slugs = new Set([
    ...names(await readdir(content), '.md'),
    ...names(await optional(() => readdir(draftFolder)), '.json'),
  ]);
  const articles = await Promise.all([...slugs].map(readArticle));
  return articles.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
    .map(({ slug, translations, draft }) => ({ slug, title: translations.fa.title || slug, draft: !!draft }));
}

const clean = (value) => typeof value === 'string' ? value.trim() : '';
const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

export async function saveDraft(slug, input) {
  if (!validSlug(slug)) throw new Error('شناسهٔ مطلب باید با حروف انگلیسی، عدد و خط تیره باشد.');
  const previous = await readArticle(slug);
  const date = clean(input.date) || previous?.date || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toJSON()?.slice(0, 10) !== date) {
    throw new Error('تاریخ داخلی معتبر نیست.');
  }
  const category = clean(input.category);
  if (!categories.includes(category)) throw new Error('دستهٔ مطلب را انتخاب کنید.');
  const sources = (Array.isArray(input.sources) ? input.sources : [])
    .map((source) => ({ label: clean(source?.label), url: clean(source?.url) }))
    .filter((source) => source.url || source.label);
  const translations = {};
  for (const lang of languages) {
    translations[lang] = Object.fromEntries(fields.map((field) => [field, clean(input.translations?.[lang]?.[field])]));
  }
  const draft = { slug, category, date, sources, translations };
  for (const type of ['image', 'video']) {
    const filename = clean(input[type]);
    if (filename) {
      if (mediaType(filename) !== type || !(await resolveMedia(filename))) {
        throw new Error('فایل انتخاب‌شده در پوشهٔ رسانه‌ها پیدا نشد.');
      }
      draft[type] = filename;
    }
  }
  for (const key of ['linkedinUrl', 'linkedinEmbedUrl']) {
    if (previous?.[key]) draft[key] = previous[key];
  }
  await mkdir(draftFolder, { recursive: true });
  await writeAtomic(draftFile(slug), JSON.stringify(draft, null, 2) + '\n');
  return draft;
}

export async function resolveMedia(name) {
  if (!mediaType(name)) return undefined;
  for (const folder of [incomingMedia, publishedMedia]) {
    const path = join(folder, name);
    if (await optional(() => access(path).then(() => true))) return path;
  }
}

async function mediaSources(article) {
  const files = [];
  for (const key of ['image', 'video']) {
    if (!article[key]) continue;
    const file = await resolveMedia(article[key]);
    if (!file) throw new Error('رسانهٔ مطلب پیدا نشد.');
    files.push({ source: file, name: article[key] });
  }
  return files;
}

function completedTranslations(article) {
  const ready = [];
  for (const lang of languages) {
    const version = article.translations[lang];
    const filled = [version.title, version.summary, version.body].filter(Boolean);
    if (filled.length === 3) ready.push(lang);
    else if (lang === 'fa' || filled.length > 0) {
      throw new Error('عنوان، خلاصه و متن نسخهٔ ' + lang + ' را کامل کنید.');
    }
  }
  for (const source of article.sources) {
    if (!source.label || !safeUrl(source.url)) throw new Error('برای هر منبع، عنوان و نشانی HTTPS معتبر وارد کنید.');
  }
  return ready;
}

export async function writeArticle(article, { preservePersian = false } = {}) {
  if (!validSlug(article.slug)) throw new Error('شناسهٔ مطلب معتبر نیست.');
  const ready = completedTranslations(article);
  const files = await mediaSources(article);
  if (files.length > 0) await mkdir(publishedMedia, { recursive: true });
  for (const { source, name } of files) {
    const destination = join(publishedMedia, name);
    if (source !== destination) await copyFile(source, destination);
  }
  for (const lang of ready) {
    if (lang === 'fa' && preservePersian) continue;
    const { title, summary, body, mediaAlt } = article.translations[lang];
    const metadata = {
      title, summary, category: article.category, date: article.date, sources: article.sources,
      ...Object.fromEntries(['image', 'video', 'linkedinUrl', 'linkedinEmbedUrl']
        .filter((key) => article[key]).map((key) => [key, article[key]])),
      ...(mediaAlt ? { mediaAlt } : {}),
    };
    if (lang !== 'fa') await mkdir(join(content, lang), { recursive: true });
    await writeAtomic(articleFile(article.slug, lang), '---\n' + stringify(metadata) + '---\n\n' + body + '\n');
  }
}

export async function stageDrafts() {
  const slugs = names(await optional(() => readdir(draftFolder)), '.json');
  const drafts = await Promise.all(slugs.map(readArticle));
  for (const article of drafts) {
    try {
      completedTranslations(article);
      await mediaSources(article);
    } catch (error) {
      throw new Error(article.slug + ': ' + error.message);
    }
  }
  for (const article of drafts) await writeArticle(article);
  return slugs;
}

export async function clearPublishedDrafts(slugs) {
  for (const slug of slugs) await optional(() => unlink(draftFile(slug)));
}

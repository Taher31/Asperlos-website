import { randomUUID } from 'node:crypto';
import { access, copyFile, mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import { parse, stringify } from 'yaml';
import { journalImageName } from '../../src/lib/journal-figures.mjs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
const content = join(root, 'src', 'content', 'journal');
const working = join(root, '.journal-editor');
const draftFolder = join(working, 'drafts');
export const categoryFile = 'src/data/journal-categories.json';
const categoryDraftFile = join(working, 'journal-categories.json');
export const incomingMedia = join(working, 'media');
export const publishedMedia = join(root, 'public', 'journal-media');
export const languages = ['fa', 'en', 'ru'];
const markdown = new MarkdownIt();
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
const asJson = (value) => JSON.stringify(value, null, 2) + '\n';

async function categoryDrafts() {
  const raw = await optional(() => readFile(categoryDraftFile, 'utf8'));
  return raw ? JSON.parse(raw) : [];
}

async function mergeCategories(drafts) {
  const published = JSON.parse(await readFile(join(root, categoryFile), 'utf8'));
  return [...new Map([...published, ...drafts].map((category) => [category.id, category])).values()];
}

export async function listCategories() {
  const drafts = await categoryDrafts();
  return { categories: await mergeCategories(drafts), pending: drafts.length > 0 };
}

export async function saveCategory(id, input) {
  if (!validSlug(id)) throw new Error('شناسهٔ دسته باید با حروف انگلیسی کوچک، عدد و خط تیره باشد.');
  const mode = input?.mode;
  if (mode !== 'create' && mode !== 'rename') throw new Error('نوع تغییر دسته معتبر نیست.');
  const labels = Object.fromEntries(languages.map((lang) => [lang, clean(input?.labels?.[lang])]));
  if (Object.values(labels).some((label) => !label || label.length > 80 || /[\r\n]/.test(label))) {
    throw new Error('نام دسته را در هر سه زبان، در یک خط و حداکثر ۸۰ نویسه بنویسید.');
  }
  const drafts = await categoryDrafts();
  const categories = await mergeCategories(drafts);
  const exists = categories.some((category) => category.id === id);
  if (mode === 'create' && exists) throw new Error('دسته‌ای با این شناسه وجود دارد.');
  if (mode === 'rename' && !exists) throw new Error('دستهٔ انتخاب‌شده پیدا نشد.');
  const category = { id, labels };
  const updated = new Map(drafts.map((draft) => [draft.id, draft]));
  updated.set(id, category);
  await mkdir(working, { recursive: true });
  await writeAtomic(categoryDraftFile, asJson([...updated.values()]));
  return { category, ...(await listCategories()) };
}

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
  const { categories } = await listCategories();
  if (!categories.some(({ id }) => id === category)) throw new Error('دستهٔ مطلب را انتخاب کنید.');
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
  await writeAtomic(draftFile(slug), asJson(draft));
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
  const names = new Set([article.image, article.video].filter(Boolean));
  for (const { body } of Object.values(article.translations)) {
    for (const token of markdown.parse(body, {}).flatMap((block) => block.children ?? [])) {
      if (token.type !== 'image') continue;
      const name = journalImageName(token.attrGet('src'));
      if (name) names.add(name);
    }
  }
  const files = [];
  for (const name of names) {
    const source = await resolveMedia(name);
    if (!source) throw new Error('رسانهٔ مطلب پیدا نشد: ' + name);
    files.push({ source, name });
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
  const categoryChanges = await categoryDrafts();
  const categories = await mergeCategories(categoryChanges);
  const categoryIds = new Set(categories.map(({ id }) => id));
  for (const article of drafts) {
    try {
      if (!categoryIds.has(article.category)) throw new Error('دستهٔ مطلب پیدا نشد.');
      completedTranslations(article);
      await mediaSources(article);
    } catch (error) {
      throw new Error(article.slug + ': ' + error.message);
    }
  }
  if (categoryChanges.length) await writeAtomic(join(root, categoryFile), asJson(categories));
  for (const article of drafts) await writeArticle(article);
  return { slugs, stagedCategories: categoryChanges.length > 0 };
}

export async function clearPublishedDrafts({ slugs, stagedCategories }) {
  for (const slug of slugs) await optional(() => unlink(draftFile(slug)));
  if (stagedCategories) await optional(() => unlink(categoryDraftFile));
}

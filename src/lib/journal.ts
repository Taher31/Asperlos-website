import { getCollection } from 'astro:content';
import { localizePath, type Lang } from '../i18n';
import journalCategories from '../data/journal-categories.json';

const journalLabels = new Map(journalCategories.map(({ id, labels }) => [id, labels]));

export function journalCategoryLabel(id: string, lang: Lang) {
  const labels = journalLabels.get(id);
  if (labels?.[lang]) return { text: labels[lang], lang };
  if (labels?.fa) return { text: labels.fa, lang: 'fa' as const };
  return { text: id, lang };
}

export async function getJournalEntries(lang?: Lang) {
  const entries = await getCollection('journal', (entry) => !lang || journalLang(entry.id) === lang);
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

export const journalLang = (id: string): Lang => {
  const prefix = id.split('/')[0];
  return prefix === 'ru' || prefix === 'en' ? prefix : 'fa';
};
export const journalSlug = (id: string) => id.split('/').at(-1)!;
export const journalPath = (id: string) => localizePath(journalLang(id), `/journal/${journalSlug(id)}/`);

export async function getLocalizedJournalEntries(lang: Lang) {
  const entries = await getJournalEntries();
  const localized = new Map(
    entries.filter((entry) => journalLang(entry.id) === lang).map((entry) => [journalSlug(entry.id), entry]),
  );
  return entries
    .filter((entry) => journalLang(entry.id) === 'fa')
    .map((entry) => localized.get(journalSlug(entry.id)) ?? entry);
}

import { getCollection } from 'astro:content';
import { localizePath, type Lang } from '../i18n';

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

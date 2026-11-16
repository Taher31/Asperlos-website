import { getCollection } from 'astro:content';

export async function getJournalEntries() {
  const entries = await getCollection('journal');
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

export const journalPath = (id: string) => `/fa/journal/${id}/`;

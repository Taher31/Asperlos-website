import { getCollection } from 'astro:content';

export async function getJournalEntries() {
  const entries = await getCollection('journal');
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

export const journalPath = (id: string) => `/fa/journal/${id}/`;

const persianDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'long', timeZone: 'UTC' });
export const formatJournalDate = (date: Date) => persianDate.format(date);

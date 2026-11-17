import type { APIRoute } from 'astro';
import { getJournalEntries, journalSlug } from '../../lib/journal';

export const GET: APIRoute = async () => {
  const entries = await getJournalEntries();
  const slugs = [...new Set(entries.map((entry) => journalSlug(entry.id)))];
  return new Response(JSON.stringify(slugs), { headers: { 'Content-Type': 'application/json' } });
};

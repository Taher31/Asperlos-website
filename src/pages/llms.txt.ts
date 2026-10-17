// llms.txt (https://llmstxt.org): a plain summary of the company for AI assistants, built from the English content.
// Lines that still contain a placeholder ([TBD: …]) are left out, so only confirmed facts are listed.
import type { APIRoute } from 'astro';
import { getOriginPages, getProducts, productPath, slugOf } from '../lib/content';
import en from '../i18n/en.json';

const TBD = /\[(?:TBD|تکمیل شود|уточняется)[^\]]*\]/;

export const GET: APIRoute = async ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const products = await getProducts('en');
  const origins = await getOriginPages('en');

  const facts = [
    `Registered name: ${en.about.registeredNameValue}`,
    `Founded: ${en.about.foundedValue}`,
    `Registration: ${en.about.registrationValue}`,
    `Address: ${en.contact.addressValue}`,
    'Phone: +98 51 3878 8331',
    'Languages: English, Persian (/fa/), Russian (/ru/)',
  ];
  const productLines = products.map((p) => {
    const specs = (p.data.specs ?? []).map((s) => `${s.label}: ${s.value}`).join('; ');
    return `- [${p.data.title}](${abs(productPath(p))}): ${p.data.summary}${specs ? ` Specification: ${specs}.` : ''}`;
  });
  const originLines = origins.map((o) => `- [${o.data.title}](${abs(`/origins/${slugOf(o)}/`)}): ${o.data.summary}`);

  const lines = [
    '# Asperlos',
    '',
    `> ${en.meta.homeDescription}`,
    '',
    'Asperlos does not publish prices. Buyers request a quote through the inquiry form or messengers.',
    '',
    '## Company',
    ...facts.map((f) => `- ${f}`),
    '',
    '## Products',
    ...productLines,
    '',
    '## Origins',
    ...originLines,
    '',
    '## Pages',
    `- [How we work](${abs('/how-we-work/')}): ${en.meta.howDescription}`,
    `- [About](${abs('/about/')}): ${en.meta.aboutDescription}`,
    `- [Contact](${abs('/contact/')}): ${en.meta.contactDescription}`,
    `- [Request a quote](${abs('/inquiry/')}): ${en.meta.inquiryDescription}`,
    `- [FAQ](${abs('/faq/')}): ${en.meta.faqDescription}`,
    '',
    '## Frequently asked questions',
    ...en.faq.items.map((item) => `- ${item.q} ${item.a}`),
  ].filter((line) => !TBD.test(line));

  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

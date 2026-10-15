import en from './en.json';
import fa from './fa.json';
import ru from './ru.json';

export const languages = ['en', 'fa', 'ru'] as const;
export type Lang = (typeof languages)[number];
export const defaultLang: Lang = 'en';

export const langMeta: Record<Lang, { name: string; dir: 'ltr' | 'rtl'; hreflang: string; ogLocale: string }> = {
  en: { name: 'English', dir: 'ltr', hreflang: 'en', ogLocale: 'en_GB' },
  fa: { name: 'فارسی', dir: 'rtl', hreflang: 'fa', ogLocale: 'fa_IR' },
  ru: { name: 'Русский', dir: 'ltr', hreflang: 'ru', ogLocale: 'ru_RU' },
};

/** Separator for inline lists (Persian uses the Arabic comma). */
export const listSep: Record<Lang, string> = { en: ', ', fa: '، ', ru: ', ' };

type Dict = typeof en;
const dicts: Record<Lang, Dict> = { en, fa, ru };

// Every language must have exactly the same keys as English, so a missing translation fails the build.
function keysOf(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => keysOf(v, `${prefix}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}
const enKeys = keysOf(en).sort().join('\n');
for (const lang of languages) {
  if (keysOf(dicts[lang]).sort().join('\n') !== enKeys) {
    throw new Error(`src/i18n/${lang}.json does not have the same keys as en.json`);
  }
}

/** Placeholders for content that is not confirmed yet (docs/brand-guide.md): [TBD: …], [تکمیل شود: …], [уточняется: …] */
const TBD = /\[(?:TBD|تکمیل شود|уточняется)[^\]]*\]/g;

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Escapes text and highlights placeholders, for use with set:html. */
export function markTbd(s: string): string {
  return escapeHtml(s).replace(TBD, (m) => `<span class="tbd">${m}</span>`);
}

export function isTbd(s: string | null | undefined): boolean {
  return !s || new RegExp(TBD.source).test(s);
}

export function useTranslations(lang: Lang) {
  const dict = dicts[lang];
  return {
    dict,
    /** Plain text with {name} parameters filled in. */
    t(text: string, params: Record<string, string | number> = {}): string {
      return text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
    },
    /** HTML-safe text with placeholders highlighted. */
    h(text: string, params: Record<string, string | number> = {}): string {
      return markTbd(text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`)));
    },
  };
}

/** Path for a language: '/products/' → '/products/' (en), '/fa/products/', '/ru/products/'. */
export function localizePath(lang: Lang, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return lang === defaultLang ? clean : `/${lang}${clean}`;
}

/** Strips the language prefix from a pathname: '/fa/products/' → '/products/'. */
export function unlocalizePath(pathname: string): string {
  const m = pathname.match(/^\/(fa|ru)(\/.*)?$/);
  return m ? m[2] || '/' : pathname;
}

/** getStaticPaths entries for the three languages; English lives at the root. */
export function langPaths() {
  return languages.map((lang) => ({ params: { lang: lang === defaultLang ? undefined : lang }, props: { lang } }));
}

export function formatYear(lang: Lang, date = new Date()): string {
  if (lang === 'fa') return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(date).replace(/\s*ه‍?\.ش\.?/, '');
  return String(date.getFullYear());
}

# Asperlos website

Corporate B2B website for Asperlos, an Iranian trading company importing pulses from Russia and dried fruit from Uzbekistan.

## Required reading

- **[docs/brand-guide.md](docs/brand-guide.md)**: read it before writing, editing, translating or reviewing ANY user-facing text (site content, i18n strings, alt text, meta descriptions, messages). Its glossary, standard CTA strings, per-language style rules and banned-claims list are binding.
- [docs/adr/0001-website-architecture.md](docs/adr/0001-website-architecture.md): architecture decisions (Astro static site + PHP inquiry form on cPanel, Canada host).
- [docs/site-structure.md](docs/site-structure.md): sitemap, page contents, content data model, folder layout.

## Key rules

- Languages: English (default, `/`), Persian (`/fa/`, RTL), Russian (`/ru/`). Claude writes all translations; keep all three in sync.
- Current domain is **temporary**: `esperlos.sbs` (its spelling differs from the brand; the brand is **Asperlos**, so never write "Esperlos" in content). Define it only via `site` in `astro.config.mjs`; never hard-code absolute URLs, so the domain can be swapped with 301 redirects later.
- **No prices anywhere** on the site. Conversion goals are the inquiry form and messenger buttons.
- Zero requests to external domains: self-host fonts, icons, scripts (Google services are blocked or slow in Iran).
- Never publish placeholder specs/figures or anything marked `[تکمیل شود]`.
- When a new term is needed, add it to the glossary in `docs/brand-guide.md` first, then use it.
- The user communicates in Persian; reply in Persian.

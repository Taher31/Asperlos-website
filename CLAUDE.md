# Asperlos website

Corporate B2B website for Asperlos, a Tehran-based trading company for sourcing, import and export. The product catalogue, sourcing markets and shipment report are examples of its work.

## Required reading

- **[docs/brand-guide.md](docs/brand-guide.md)**: read it before writing, editing, translating or reviewing ANY user-facing text (site content, i18n strings, alt text, meta descriptions, messages). Its glossary, standard CTA strings, per-language style rules and banned-claims list are binding.
- [docs/adr/0001-website-architecture.md](docs/adr/0001-website-architecture.md): architecture decisions (Astro static site + PHP inquiry form on cPanel, Canada host).
- [docs/site-structure.md](docs/site-structure.md): sitemap, page contents, content data model, folder layout.

## Key rules

- Languages: English (default, `/`), Persian (`/fa/`, RTL), Russian (`/ru/`). Claude writes all translations; keep all three in sync.
- The canonical domain is `asperlos.ir`. Generate absolute site URLs from `site` in `astro.config.mjs`. Use the brand name **Asperlos** in content.
- **No prices anywhere** on the site. Conversion goals are the inquiry form and messenger buttons.
- Zero requests to external domains: self-host fonts, icons, scripts (Google services are blocked or slow in Iran).
- Never publish placeholder specs/figures or anything marked `[تکمیل شود]`.
- When a new term is needed, add it to the glossary in `docs/brand-guide.md` first, then use it.
- The user communicates in Persian; reply in Persian.

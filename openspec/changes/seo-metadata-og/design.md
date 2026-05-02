## Context

`apps/web` currently exports no `Metadata` on the home page and no Open Graph or canonical fields from `generateMetadata` on category pages. Social crawlers receive bare URLs and no description, producing un-styled link previews. Search engines may also index `/air-quality` and `/air-quality/` as separate documents because no canonical URL is declared.

Next.js 16 App Router exposes a first-class `Metadata` / `generateMetadata` API that renders into `<head>` at build time with zero runtime overhead, making it the correct place to solve this.

## Goals / Non-Goals

**Goals:**
- Provide a typed, env-var-backed helper (`siteUrl.ts`) that any `apps/web` module can use to build absolute URLs.
- Export explicit `Metadata` from `layout.tsx` (defaults), `page.tsx` (home), and `[category]/page.tsx` (per-category).
- Include `openGraph`, `twitter`, and `alternates.canonical` on every page, with trailing slash on all URLs.
- Document `NEXT_PUBLIC_SITE_URL` in `.env.example`.

**Non-Goals:**
- OG image generation — deferred until content strategy is defined.
- `hreflang` / i18n — out of scope.
- Metadata for API or shared package.
- Dynamic metadata from live API data.

## Decisions

### D1 — `siteUrl.ts` helper instead of inline `process.env` reads
**Decision**: Centralise base-URL logic in `apps/web/src/lib/siteUrl.ts`.  
**Rationale**: Env-var reads scattered across page files are hard to test and easy to misconfigure. A single helper that validates and normalises the value (strips trailing slash, falls back to `http://localhost:3000`) gives one place to change and one place to test.  
**Alternative considered**: Inline `process.env.NEXT_PUBLIC_SITE_URL` at each call site — rejected because it duplicates the fallback logic and makes the contract invisible.

### D2 — `alternates.canonical` with trailing slash everywhere
**Decision**: All canonical and OG URLs produced by this change end with `/`.  
**Rationale**: AGENTS.md mandates trailing slashes on all navigable URLs for SEO consistency. `next.config.ts` already has `trailingSlash: true`. Using consistent trailing slashes avoids duplicate-content risk between `/air-quality` and `/air-quality/`.  
**Alternative considered**: Let Next.js resolve canonical automatically — rejected because Next.js does not auto-inject `<link rel="canonical">` without an explicit `alternates.canonical` export.

### D3 — Root `layout.tsx` carries base-level defaults; pages override
**Decision**: `layout.tsx` exports the fallback `openGraph` site name and `twitter.card`. Individual pages export their own `title`, `description`, `openGraph.title/description`, and `alternates.canonical`.  
**Rationale**: This is the idiomatic Next.js metadata inheritance pattern — defaults cascade, pages override only what differs. Avoids duplication while ensuring every page has complete metadata.

## Risks / Trade-offs

- **[Risk] `NEXT_PUBLIC_SITE_URL` not set in production** → `siteUrl.ts` falls back to `http://localhost:3000`, producing incorrect canonical URLs in production. Mitigation: document the var in `.env.example`; CI/CD env setup should set it before build.
- **[Risk] Twitter card fields deprecated in future Next.js** → Low probability; `twitter` metadata is a stable Next.js API field. No mitigation needed now.
- **[Trade-off] No OG image** → Rich-preview cards will show title/description but no image. Accepted until an image strategy is defined.

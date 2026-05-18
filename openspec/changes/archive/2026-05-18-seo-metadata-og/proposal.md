## Why

Pages in `apps/web` expose no Open Graph or canonical metadata, so social shares produce bare URLs with no rich cards, and crawlers risk indexing duplicate URLs (`/air-quality` vs `/air-quality/`) as separate pages. Adding explicit per-page metadata closes these SEO gaps before the site goes live.

## What Changes

- Add `NEXT_PUBLIC_SITE_URL` env var (default `http://localhost:3000`) and document it in `apps/web/.env.example`.
- Add `apps/web/src/lib/siteUrl.ts` — typed helper that reads and normalises the env var.
- Update `apps/web/src/app/layout.tsx` root metadata: add default `openGraph`, `twitter`, and `alternates.canonical` for the home page.
- Add a `metadata` export to `apps/web/src/app/page.tsx` with a descriptive title, description, and page-specific OG.
- Update `generateMetadata` in `apps/web/src/app/[category]/page.tsx` to include `openGraph`, `twitter`, and `alternates.canonical` per category.
- All canonical/OG URLs use trailing slash (per AGENTS.md SEO guidelines).

## Capabilities

### New Capabilities

- `site-url-config`: Env-var-backed helper that exposes the canonical base URL to the web app at build/runtime.
- `page-metadata`: Explicit Next.js `Metadata` / `generateMetadata` exports on the home page and category pages, including Open Graph, Twitter Card, and canonical URL.

### Modified Capabilities

_(none — no existing spec-level behaviour changes)_

## Non-Goals

- OG image generation (`opengraph-image.tsx`) — deferred until real content exists.
- `og:image` tags — intentionally excluded until an image strategy is defined.
- Internationalisation / `hreflang` — out of scope.
- Changes to the API app or shared package.

## Impact

- `apps/web/src/lib/siteUrl.ts` — new file.
- `apps/web/src/app/layout.tsx` — metadata update.
- `apps/web/src/app/page.tsx` — new `metadata` export.
- `apps/web/src/app/[category]/page.tsx` — `generateMetadata` extended.
- `apps/web/.env.example` — new env var documented.
- `apps/web/__tests__/` — existing metadata tests updated; new tests for `siteUrl` helper.
- Snapshot files updated to reflect new HTML `<head>` attributes (if any are captured).

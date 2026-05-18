## 1. Base URL Helper

- [x] 1.1 Create `apps/web/src/lib/siteUrl.ts` exporting a `siteUrl()` function that reads `NEXT_PUBLIC_SITE_URL`, strips any trailing slash, and falls back to `http://localhost:3000`
- [x] 1.2 Add `NEXT_PUBLIC_SITE_URL=` entry with inline comment to `apps/web/.env.example`
- [x] 1.3 Write `apps/web/__tests__/lib/siteUrl.test.ts` with scenarios: env var set, env var with trailing slash, env var absent

## 2. Root Layout Default Metadata

- [x] 2.1 Add a `metadata` export to `apps/web/src/app/layout.tsx` with `openGraph.siteName: "eco-metrics earth"` and `twitter.card: "summary"`
- [x] 2.2 Update `apps/web/__tests__/app/layout.test.tsx` to assert the new metadata fields (or add a dedicated test if the existing test doesn't cover metadata)

## 3. Home Page Metadata

- [x] 3.1 Add a `metadata` export to `apps/web/src/app/page.tsx` with `title`, `description`, `alternates.canonical`, `openGraph` (title, description, url), and `twitter` (title, description) — all using `siteUrl()` for absolute URLs with trailing slash
- [x] 3.2 Update or create `apps/web/__tests__/app/page.test.tsx` to assert the home metadata fields (title, canonical URL, OG title)
- [x] 3.3 Update affected snapshots if any

## 4. Category Page Metadata

- [x] 4.1 Extend `generateMetadata` in `apps/web/src/app/[category]/page.tsx` to include `alternates.canonical`, `openGraph` (title, description, url), and `twitter` (title, description) for valid category slugs; return no OG/canonical for unknown slugs
- [x] 4.2 Update `apps/web/__tests__/app/[category]/page.test.tsx` to assert canonical, OG title, and OG URL for a known category (e.g. `air-quality`)
- [x] 4.3 Update affected snapshots if any

## 5. Verification

- [x] 5.1 Run `npx nx test web` — all tests pass with zero errors or warnings
- [x] 5.2 Run `npx nx build web` — build succeeds with no TypeScript errors
- [x] 5.3 Run `npm run lint` — no lint errors

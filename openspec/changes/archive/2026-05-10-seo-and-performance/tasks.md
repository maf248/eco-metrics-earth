## 1. Dependencies

- [x] 1.1 Install `sharp` as a root devDependency with exact version: `npm install --save-exact --save-dev sharp` (verify latest version compatible with Node 20 at https://www.npmjs.com/package/sharp)

## 2. PWA icon generation script

- [x] 2.1 Create `scripts/generate-pwa-icons.mjs` at the repo root — ESM script that imports `sharp`, reads `apps/web/public/icons/eco-metrics-earth.svg`, and writes `icon-192.png` (192×192) and `icon-512.png` (512×512) to `apps/web/public/icons/`
- [x] 2.2 Run the script: `node scripts/generate-pwa-icons.mjs` from the repo root and verify both PNG files are created in `apps/web/public/icons/`
- [x] 2.3 Add the generated PNGs to git: `git add apps/web/public/icons/icon-192.png apps/web/public/icons/icon-512.png`

## 3. Root layout metadata

- [x] 3.1 In `apps/web/src/app/layout.tsx`, add `type: 'website'` and `siteName: 'eco-metrics earth'` to the `openGraph` metadata object
- [x] 3.2 Add `images: [{ url: '/icons/eco-metrics-earth.svg', width: 512, height: 512, alt: 'eco-metrics earth logo' }]` to the `openGraph` metadata object
- [x] 3.3 Add `card: 'summary'` and `images: ['/icons/eco-metrics-earth.svg']` to the `twitter` metadata object
- [x] 3.4 Add `themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }, { media: '(prefers-color-scheme: light)', color: '#ffffff' }]` to the root `Metadata` object
- [x] 3.5 Add `icons: { icon: '/icons/eco-metrics-earth.svg', apple: '/icons/eco-metrics-earth.svg' }` to the root `Metadata` object

## 4. 404 page metadata

- [x] 4.1 In `apps/web/src/app/not-found.tsx`, add `description: 'The page you are looking for does not exist. Return to eco-metrics earth.'` to the `metadata` export object

## 5. Category pages — Static generation

- [x] 5.1 In `apps/web/src/app/[category]/page.tsx`, add `export const dynamicParams = false` at the module level
- [x] 5.2 Add `export async function generateStaticParams(): Promise<{ category: string }[]>` that returns `Object.keys(ECO_CATEGORIES).map((slug) => ({ category: slug }))` (import `ECO_CATEGORIES` from `'@eco-metrics/shared'` if not already imported)

## 6. PWA manifest

- [x] 6.1 In `apps/web/src/app/manifest.ts`, add two new entries to the `icons` array: `{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' }` and `{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }`

## 7. Sitemap

- [x] 7.1 In `apps/web/src/app/sitemap.ts`, add `lastModified: new Date()` to every entry object returned by the sitemap function

## 8. Robots.txt

- [x] 8.1 In `apps/web/src/app/robots.ts`, add `{ userAgent: '*', disallow: ['/api/'] }` to the `rules` array (keep the existing `allow` rule)

## 9. Tests

- [x] 9.1 In `apps/web/__tests__/app/sitemap.test.ts`, add an assertion that every entry in the sitemap result has a `lastModified` property that is an instance of `Date`
- [x] 9.2 In `apps/web/__tests__/app/[category]/page.test.tsx`, add a test for `generateStaticParams()` asserting it returns an array of objects with `{ category: string }` shape and the correct count matching `Object.keys(ECO_CATEGORIES).length`
- [x] 9.3 Run `npx nx test web` — all tests must pass with zero errors and zero warnings

## 10. Verification

- [x] 10.1 Run `npx nx build web` — must succeed with no errors; verify the build output folder contains static HTML files for each category slug (e.g., `out/air-quality/index.html`)
- [x] 10.2 Run `npm run lint` — zero errors

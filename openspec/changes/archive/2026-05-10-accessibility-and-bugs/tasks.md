## 1. Skip-link fix

- [x] 1.1 In `apps/web/src/app/layout.tsx`, verify the skip-link anchor (`<a href="#main-content">`) exists and uses `id="main-content"` as its target; if the id or the skip-link is missing, add it
- [x] 1.2 In `apps/web/src/app/not-found.tsx`, add `id="main-content"` and `tabIndex={-1}` to the `<main>` element

## 2. CO2 title override

- [x] 2.1 In `apps/web/src/lib/categoryTitle.ts`, add the entry `'co2-emissions': 'CO2 Emissions'` to the `TITLE_OVERRIDES` map (alongside the existing `'waste-recycling'` entry)
- [x] 2.2 In `apps/web/__tests__/app/[category]/page.test.tsx`, update any assertion that expected `'Co2 Emissions'` to now expect `'CO2 Emissions'`
- [x] 2.3 In `apps/web/__tests__/lib/categoryTitle.test.ts` (or wherever `getCategoryTitle` is tested), update the `'co2-emissions'` test case to assert `'CO2 Emissions'`

## 3. NavLink active-state normalisation

- [x] 3.1 In `apps/web/src/components/NavLink.tsx`, replace the current `isActive` comparison with a normalised version: define `const normalise = (p: string): string => p.replace(/\/$/, '') || '/'` and use `isActive = normalise(href) === normalise(pathname)`
- [x] 3.2 In `apps/web/__tests__/components/NavLink.test.tsx`, add test cases covering: (a) href with trailing slash, pathname without; (b) href without trailing slash, pathname with; (c) root path `/` remains active; (d) different paths return false

## 4. Accessibility improvements

- [x] 4.1 In `apps/web/src/components/NavScrollContainer.tsx`, add `aria-label="Navigation items"` (or equivalent) to the inner `<ul>` element
- [x] 4.2 In each icon component in `apps/web/src/components/icons/*.tsx`, add an optional `title?: string` prop to the interface (extend `SVGProps<SVGSVGElement>`); when `title` is provided, render `<title id="{componentName}-title">{title}</title>` as the first child of `<svg>` and add `aria-labelledby="{componentName}-title"` to the `<svg>` element; when `title` is absent, ensure `aria-hidden` defaults to `true`
- [x] 4.3 In `apps/web/src/components/NavLink.tsx`, check `tailwind.config.*` for a semantic colour token for the focus ring offset; replace the hardcoded `ring-offset-black` class with the appropriate Tailwind token (e.g., `dark:ring-offset-gray-950 ring-offset-white`) — if no semantic token exists, define one in the Tailwind config

## 5. Tests

- [x] 5.1 In `apps/web/__tests__/app/not-found.test.tsx`, add an assertion that the `<main>` element has `tabIndex={-1}` and `id="main-content"`
- [x] 5.2 In `apps/web/__tests__/components/NavScrollContainer.test.tsx`, add an assertion that the `<ul>` element has an `aria-label` attribute
- [x] 5.3 Run `npx nx test web` — all tests must pass with zero errors and zero warnings (no console.error, no console.warn)

## 6. Verification

- [x] 6.1 Run `npx nx build web` — must succeed with zero errors
- [x] 6.2 Run `npm run lint` — zero errors and zero warnings

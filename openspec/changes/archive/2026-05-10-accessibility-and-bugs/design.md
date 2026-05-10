## Context

A focused audit found four correctness/accessibility issues affecting real users:

1. **Skip-link broken**: The `<main>` element in `not-found.tsx` (and potentially other pages) lacks `tabIndex={-1}`, so pressing the skip-link in a keyboard-only session does nothing — the browser cannot focus a non-interactive element programmatically.
2. **CO2 capitalisation**: `getCategoryTitle('co2-emissions')` returns `'Co2 Emissions'` because the slug-to-title conversion splits on `-` and capitalises each word's first letter (`co2` → `Co2`). The correct chemical formula is `CO2`.
3. **NavLink `isActive` fragility**: The active-link comparison is a strict string equality between `href` and `pathname`. If one has a trailing slash and the other does not, the comparison fails silently.
4. **Minor a11y gaps**: The nav `<ul>` has no accessible label; icon SVGs have no `<title>` fallback; focus ring offset colour is hardcoded black.

## Goals / Non-Goals

**Goals:**
- Make the skip-link functional for keyboard users on all pages.
- Display `CO2 Emissions` (uppercase) using a TITLE_OVERRIDES map entry.
- Make `isActive` robust against trailing-slash variation.
- Add `aria-label` to the nav `<ul>`.
- Add `<title>` + `aria-labelledby` to icon SVGs.
- Update focus ring offset to a semantic colour token.

**Non-Goals:**
- Full WCAG 2.2 AA audit.
- Colour contrast redesign.
- Skip-link on all pages (the layout already has one; the fix is making `<main>` focusable, which is a one-line change).
- Animated focus indicators.

## Decisions

### D1 — `tabIndex={-1}` on `<main>` is the correct pattern

**Decision**: Add `tabIndex={-1}` to the `<main>` element in `not-found.tsx`. The layout's skip-link uses `href="#main-content"` and calls `focus()` on the target — this only works if the target element is programmatically focusable. `tabIndex={-1}` makes it focusable via script without adding it to the natural tab order.

**Note**: Verify the layout's skip-link `href` matches the `id` on `<main>`. If the id is `"main-content"`, the `<main>` should have `id="main-content" tabIndex={-1}`.

### D2 — `TITLE_OVERRIDES` map for CO2

**Decision**: Add `'co2-emissions': 'CO2 Emissions'` to the existing `TITLE_OVERRIDES` map in `categoryTitle.ts`. The `getCategoryTitle` function already checks this map before applying the generic slug-to-words conversion, so no logic change is needed — only a data entry.

**Rationale**: The override pattern already exists for `waste-recycling` → `Waste & Recycling`. This is the idiomatic extension point.

### D3 — Normalise trailing slashes in `isActive`

**Decision**: Normalise both `href` and the current `pathname` by removing trailing slashes before comparison:
```ts
const normalise = (p: string) => p.replace(/\/$/, '') || '/';
const isActive = normalise(href) === normalise(pathname);
```
The `|| '/'` guard prevents the root `/` from normalising to an empty string.

**Rationale**: `usePathname()` in Next.js App Router returns the canonical pathname, which includes trailing slashes when `trailingSlash: true` is set. Nav item `href` values may or may not include trailing slashes depending on who writes them. Normalisation makes the comparison invariant.

### D4 — SVG icon `<title>` + `aria-labelledby` pattern

**Decision**: Add an optional `title` prop to each icon component. When provided, render a `<title id="...">` inside the SVG and add `aria-labelledby` pointing to that id. When absent (default), keep `aria-hidden="true"` as the default. This makes icons accessible when used in a non-decorative context without changing existing usage.

```tsx
interface IconProps extends SVGProps<SVGSVGElement> {
  title?: string;
}
// Usage: <AirQualityIcon title="Air Quality" /> — accessible
// Usage: <AirQualityIcon aria-hidden /> — decorative (current default)
```

### D5 — Focus ring offset colour

**Decision**: Replace `ring-offset-black` with `ring-offset-background` (if defined in Tailwind config) or with `dark:ring-offset-gray-950 ring-offset-white`. The exact token depends on the project's Tailwind theme. Check `tailwind.config.*` before implementing.

## Risks / Trade-offs

- **`tabIndex={-1}` and screen readers**: Adding `tabIndex={-1}` to `<main>` is the standard recommended pattern (WCAG 2.1 technique G1). No risk.
- **NavLink normalisation and root path**: The `|| '/'` guard is required. Without it, `normalise('/')` returns `''` (empty string after removing the single slash), which would incorrectly match `normalise('')` for non-root links. Test this edge case explicitly.
- **Icon `<title>` IDs**: Each icon needs a unique `id` for `aria-labelledby`. Use a combination of the icon name and a random suffix, or accept a prop. Simplest approach: derive the id from the component name (e.g., `air-quality-icon-title`), which is unique per component type.

## Open Questions

- Does the root layout already have `id="main-content"` on its `<main>`? → Check `apps/web/src/app/layout.tsx` before implementing. If not, add it along with `tabIndex={-1}`.
- What Tailwind colour token should the focus ring offset use? → Check `tailwind.config.*` for `background` or similar semantic tokens.

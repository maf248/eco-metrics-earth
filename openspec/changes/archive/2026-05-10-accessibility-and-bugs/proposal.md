## Why

An audit revealed a broken skip-link (the `<main>` target is not focusable, making keyboard navigation non-functional on the 404 page), a chemical formula displayed in wrong casing (`Co2` instead of `CO2`), a fragile `isActive` comparison in `NavLink` that can misfire when pathnames lack trailing slashes, and several minor accessibility gaps (focus ring colour, SVG ARIA, nav list labelling). These are correctness issues that affect real users — keyboard users, screen reader users, and anyone landing on a 404 page.

## What Changes

- **404 page**: Add `tabIndex={-1}` to the `<main>` element so the skip-link can programmatically focus it.
- **Category title**: Add a `TITLE_OVERRIDES` entry for `'co2-emissions'` → `'CO2 Emissions'` in `categoryTitle.ts` to fix the incorrect capitalisation.
- **NavLink `isActive`**: Normalise both `href` and `pathname` to remove trailing slashes before comparison to prevent false negatives when the router adds or omits them.
- **Focus ring**: Change the focus ring offset colour from hardcoded `ring-offset-black` to a semantic Tailwind token (`ring-offset-background` or `dark:ring-offset-gray-950`) so it adapts to both light and dark backgrounds.
- **NavScrollContainer**: Add an `aria-label` to the inner `<ul>` to give it a distinct accessible name beyond the wrapping `<nav>`.
- **Icon SVG titles**: Add `<title>` and `aria-labelledby` to icon components that may be used outside an `aria-hidden` context, so screen readers can identify them.

## Non-Goals

- Full WCAG 2.2 AA audit (broader scope than this iteration).
- Colour contrast audit and redesign (design system decision, separate change).
- Keyboard focus management for modals or overlays (none exist yet).
- Automated accessibility CI gating (part of `configuration-and-tests` iteration).

## Capabilities

### New Capabilities

- `skip-link-focus`: Focusable `<main>` landmark so the skip-link works for keyboard users.
- `co2-title-override`: Correct `CO2 Emissions` display title via `TITLE_OVERRIDES` map.
- `navlink-active-state`: Robust active-link detection normalised against trailing slashes.

### Modified Capabilities

*(none — no existing spec files exist for these components)*

## Impact

- **`apps/web/src/app/not-found.tsx`**: Add `tabIndex={-1}` to `<main>`.
- **`apps/web/src/lib/categoryTitle.ts`**: Add `'co2-emissions': 'CO2 Emissions'` to the overrides map.
- **`apps/web/src/components/NavLink.tsx`**: Normalise trailing slashes in `isActive` logic; update focus ring offset class.
- **`apps/web/src/components/NavScrollContainer.tsx`**: Add `aria-label` to `<ul>`.
- **`apps/web/src/components/icons/*.tsx`**: Add `<title>` + `aria-labelledby` pattern to each icon component.
- **Tests**: Update `co2-emissions` title assertion in `page.test.tsx`; update `NavLink` `isActive` tests; update icon render tests if needed.
- **Breaking**: None. The `isActive` fix may change active-link highlighting behaviour in edge cases where the pathname had a trailing slash but `href` did not — this is a bug fix, not a regression.

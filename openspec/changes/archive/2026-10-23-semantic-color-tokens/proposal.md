# Proposal

## Why

Theming in `apps/web` is expressed as ~95 paired `dark:` color utilities spread over 14 files (`bg-white dark:bg-black`, `text-gray-600 dark:text-gray-400`, …), plus one ad-hoc token pair (`--color-nav-surface` / `--color-nav-surface-dark`). There is no single place that says what a color _means_, so the same role drifts across components, and a chart or map library cannot consume a color that only exists as a `dark:` class — it needs one CSS custom property whose value switches with the theme. Establishing that mechanism now, on the small surface that exists, is the prerequisite for chart palettes and keeps the upcoming visualization work from inventing its own.

## What Changes

- Introduce a semantic color token layer in `apps/web/src/app/globals.css`: raw custom properties declared on `:root` (light values) and overridden under `.dark` (dark values), exposed to Tailwind through `@theme inline` so each role is a single utility (e.g. `bg-surface`, `text-fg-secondary`, `border-line`).
- Values are written in `oklch`, copied from Tailwind v4's own palette (and an exact conversion for the two existing nav-surface hex values), so the rendered colors are **identical in both themes** — this is a pure refactor with no visual change.
- Replace every Tailwind palette color utility in `apps/web/src/app/**` and `apps/web/src/components/**` — paired `dark:` utilities and theme-invariant ones (focus ring, solid emerald button and checked chip, white text on them) — with the corresponding token utility. The token set is derived only from colors the code already uses; nothing is added without a consumer. Tokens are split into a **core** set for new UI and a **legacy** set kept only for pixel-identity, to be consolidated later.
- Migrate the existing `--color-nav-surface` / `--color-nav-surface-dark` pair to the same mechanism (one `nav-surface` token that switches under `.dark`).
- Keep a small, documented set of intentional exceptions that are effects rather than role colors (see design): the theme toggle lamp state and, if they cannot be tokenized cleanly, the icon separation drop-shadows/glows.
- Add a Jest guard test that fails on any palette color utility outside the exception allowlist, or on a token with no consumer.
- Update `docs/design-system.md` (Theme Rules, core/legacy token tables, exceptions, stale nav-surface mentions), `docs/technical/libraries.md` (current-stack row and token-bridge trap), and add one sentence to `AGENTS.md` pointing to the rule and its test.
- Update the canonical specs that pin specific `dark:`-paired classes so they describe token-based theming instead.
- Update affected Jest snapshots and the class assertions in `NavLink.test.tsx`.

## Non-Goals

- **No visual change.** Consolidating near-duplicate roles (e.g. the three skeleton tints, two hover tints, two focus-ring offsets), giving the theme-invariant accent tokens a distinct dark value, and contrast improvements are follow-up changes, each with its own decision.
- **No chart, sequential, or divergent palettes.** They belong to the charting-library change, which will reuse this mechanism.
- Category icon SVG fills stay hardcoded (light-mode-styling constraint); brand raster assets (PWA icons, OG image) are untouched.
- No typography, spacing, radius, or motion tokens.
- No change to the dark-mode mechanism itself (`@custom-variant dark`, `ThemeProvider`, the blocking init script).

## Capabilities

### New Capabilities

- `design-tokens`: The semantic color token system for `apps/web` — where tokens are declared, how a token switches between light and dark, how components consume tokens, which exceptions remain, and the test that enforces it.

### Modified Capabilities

- `light-mode-styling`: Layout, navbar, and scroll-gradient scenarios currently name concrete palette classes (`bg-white`, `text-gray-600`, `bg-white/15`, …) and the "no hardcoded dark-only classes" requirement assumes `dark:` pairing; they change to describe theme adaptation through semantic tokens.
- `mobile-header-brand`: The visual-style requirement pins `background-color: black`, `border-gray-800`, and `text-emerald-400`; it changes to the surface, border, and accent tokens (already stale versus the light theme the header supports).
- `navscroll-scroll-tests`: The vertical-affordance requirement pins `from-nav-surface dark:from-nav-surface-dark`; it changes to the single switching `nav-surface` token.
- `presentation-docs`: The recorded theming fact ("paired utility classes plus the nav-surface pair; a token system is aspirational") changes to the token system now in place.

## Impact

- **Code:** `apps/web/src/app/globals.css`; 14 `.tsx` files under `apps/web/src/app/` and `apps/web/src/components/` (layout, home, category page + loading, not-found, error, `Navbar`, `NavLink`, `NavScrollContainer`, `MobileHeader`, `BrandText`, `ThemeToggle`, `WaterFootprintTable`, `WaterFootprintContent`).
- **Tests:** new `apps/web/__tests__/designTokens.test.ts`; 9 Jest snapshot files regenerate (class names only); the class assertions in `NavLink.test.tsx` and `BrandText.test.tsx` change. E2E behavior unchanged; `@axe-core/playwright` contrast checks must stay green.
- **Docs:** `docs/design-system.md`, `docs/technical/libraries.md`, `AGENTS.md`; four canonical specs via deltas.
- **Dependencies / APIs:** none.

# Design

## Context

See proposal.md (Why). Current state that shapes the approach:

- Tailwind CSS 4.3.3, class-based dark mode via `@custom-variant dark (&:where(.dark, .dark *))`; the `dark` class is set on `<html>` by a blocking inline script before first paint.
- `globals.css` has one `@theme` block with `--color-nav-surface: #eaecef` and `--color-nav-surface-dark: #1a1a1a`, consumed as `bg-nav-surface dark:bg-nav-surface-dark` and `from-nav-surface dark:from-nav-surface-dark`.
- Every other color is a palette utility: theme-dependent ones as `dark:` pairs, theme-invariant ones (focus ring `emerald-400`, the solid emerald error-page button, the checked filter chip, white text on them) unpaired. Several pairs encode the same role with small, accidental differences (e.g. hover `gray-100` vs `gray-50`, focus-ring offset `gray-950` vs `black`). Because this change is pixel-identical, those differences become distinct tokens now and are consolidated later.
- There is no visual-regression baseline in E2E; the only color assertion is the water-footprint filter-chip test comparing computed `backgroundColor` values.

## Goals / Non-Goals

**Goals:**

- One mechanism for every UI color, which a charting/mapping library can also consume (`var(--…)` switching under `.dark`).
- After the change, no palette color utility remains in `src/app/` or `src/components/` except one documented exception, and a unit test keeps it that way.
- Identical computed colors before and after, in both themes, verified mechanically rather than by eye.

**Non-Goals:**

- Renaming roles to an "ideal" semantic set that collapses the current duplicates, or giving the theme-invariant accent tokens a distinct dark value — both are visual changes for the follow-up pass.

## Decisions

### 1. Mechanism: raw variables on `:root` / `.dark`, mapped with `@theme inline`

```css
:root {
  --surface: oklch(100% 0 0);
}
.dark {
  --surface: oklch(0% 0 0);
}
@theme inline {
  --color-surface: var(--surface);
}
```

With `@theme inline`, the generated utility contains `var(--surface)` itself, so the value is resolved on the element that uses the class and always follows the nearest `.dark` override. Without `inline`, Tailwind emits `--color-surface: var(--surface)` on `:root` and utilities reference `var(--color-surface)`; a custom property that references another one is resolved where it is declared and inherited as the resolved value, so an override of `--surface` on a nested element would not reach `--color-surface`. Today `.dark` sits on `<html>` (the same element as `:root`) so both would work, but `inline` is the Tailwind-documented pattern for variables that reference other variables and keeps scoped theming (e.g. a dark preview panel) possible.

- _Alternative — keep paired tokens (`--color-x` / `--color-x-dark`) like `nav-surface` today:_ rejected; a library rendering `fill="var(--color-x)"` cannot use a `dark:` variant.

`.dark` matches the existing custom variant. Opacity modifiers keep working: `bg-surface/95` compiles to `color-mix(in oklab, var(--surface) 95%, transparent)`, the same expression `bg-black/95` produced. Library code (charts, maps) reads the raw variables, e.g. `var(--surface)`.

### 2. Naming: role-first, readable as utilities

Prefixes avoid `text-text-*` / `border-border` stutter: backgrounds are nouns (`surface`, `well`, `hover`, `control`, `skeleton`), foregrounds are `fg-*`, borders are `line-*`, the brand color is `accent`, focus is `focus-*`. Variants use `-strong` / `-subtle` / `-hover` / `-active`.

### 3. Token set (derived from the current code — every row has a consumer)

Values are Tailwind 4.3.3 palette entries copied verbatim as `oklch()` (e.g. `gray-600` = `oklch(44.6% 0.03 256.802)`); `white`/`black` are `oklch(100% 0 0)` / `oklch(0% 0 0)`; `white/N` is `oklch(100% 0 0 / 0.N)`.

**Core** — the roles new UI (tables, charts, pages) should reach for first:

| Token                 | Light       | Dark        | Consumers                                                                      |
| --------------------- | ----------- | ----------- | ------------------------------------------------------------------------------ |
| `surface`             | white       | black       | `<body>`; MobileHeader background (`/95`) and its focus ring offset            |
| `surface-raised`      | white       | gray-800    | water-footprint mobile cards, filter chips                                     |
| `nav-surface`         | `#eaecef`¹  | `#1a1a1a`¹  | Navbar; NavScrollContainer gradients                                           |
| `well`                | gray-300    | white/10    | icon containers (home, category, loading, not-found, error); inactive nav pill |
| `well-active`         | gray-400    | white/15    | active nav icon pill                                                           |
| `hover`               | gray-100    | white/5     | MobileHeader button hover; NavLink hover; NavLink active row (`lg:`)           |
| `fg`                  | gray-900    | white       | `<body>`, headings, table headers, card titles                                 |
| `fg-strong`           | black       | white       | NavLink hover text                                                             |
| `fg-body`             | gray-700    | gray-300    | table cells, body copy, empty state, secondary button text                     |
| `fg-secondary`        | gray-600    | gray-400    | page descriptions, inactive nav text, methodology summary, filter count        |
| `fg-muted`            | gray-500    | gray-400    | units, footnotes                                                               |
| `accent`              | emerald-700 | emerald-400 | BrandText, active nav text, links, filter chip focus ring                      |
| `accent-hover`        | emerald-800 | emerald-300 | link hover                                                                     |
| `accent-solid`        | emerald-600 | emerald-600 | error page primary button; skip-to-content link (focused)                      |
| `accent-solid-strong` | emerald-700 | emerald-700 | error primary button hover; checked filter chip background and border          |
| `on-accent`           | white       | white       | text on `accent-solid` / `accent-solid-strong`                                 |
| `focus-ring`          | emerald-400 | emerald-400 | focus rings (error buttons, NavLink, Navbar logo, MobileHeader, ThemeToggle)   |
| `focus-offset`        | white       | gray-950    | ring offset: error buttons, NavLink, filter chip                               |
| `line`                | gray-200    | gray-800    | MobileHeader and Navbar borders                                                |
| `line-strong`         | gray-200    | gray-700    | table head row, mobile cards                                                   |
| `line-subtle`         | gray-100    | gray-800    | table body rows                                                                |

**Legacy, to consolidate** — kept only because the refactor is pixel-identical; new UI should not adopt them:

| Token             | Light    | Dark     | Consumers                    | Likely merges into |
| ----------------- | -------- | -------- | ---------------------------- | ------------------ |
| `hover-subtle`    | gray-50  | white/5  | Navbar logo link hover       | `hover`            |
| `control`         | gray-100 | white/10 | error page secondary button  | `well` / `hover`   |
| `control-hover`   | gray-200 | white/20 | error secondary button hover | —                  |
| `toggle`          | gray-200 | white/10 | ThemeToggle background       | `control`          |
| `toggle-hover`    | gray-300 | white/20 | ThemeToggle hover            | `control-hover`    |
| `chip-hover`      | gray-50  | gray-700 | filter chip hover            | `hover`            |
| `fg-control`      | gray-700 | gray-200 | filter chip label            | `fg-body`          |
| `line-control`    | gray-300 | gray-600 | filter chip border           | `line-strong`      |
| `skeleton-strong` | gray-400 | white/20 | loading icon placeholder     | `well-active`      |
| `skeleton`        | gray-200 | white/10 | loading title placeholder    | `well`             |
| `skeleton-subtle` | gray-100 | white/5  | loading subtitle placeholder | `hover`            |

¹ `oklch(94.24% 0.0046 258.325)` and `oklch(21.78% 0 0)` — exact conversions; the implementation verifies they round-trip to the original sRGB bytes.

`accent-solid`, `accent-solid-strong`, `on-accent` and `focus-ring` hold the same value in both themes for now. They are tokens so the rule "no palette colors in components" has no carve-outs, and so the follow-up pass can give them a dark value in one place. `focus-offset` → `surface` is also a consolidation candidate.

### 4. Shadows: tokenize icon separation if the compiled CSS is clean

The icon drop-shadow (light) / glow (dark) pairs encode one documented rule in four sizes:

| Token     | Light                           | Dark                               | Consumers                 |
| --------- | ------------------------------- | ---------------------------------- | ------------------------- |
| `icon-xs` | `0 0 2px rgb(0 0 0 / 0.15)`     | none                               | MobileHeader logo         |
| `icon-sm` | Tailwind `drop-shadow-sm` value | `0 0 3px rgb(255 255 255 / 0.25)`  | NavLink icon, Navbar logo |
| `icon-lg` | Tailwind `drop-shadow-lg` value | `0 0 8px rgb(255 255 255 / 0.25)`  | category page icon        |
| `icon-xl` | Tailwind `drop-shadow-xl` value | `0 0 10px rgb(255 255 255 / 0.25)` | not-found and error icons |

Mapped as `--drop-shadow-icon-*: var(--icon-shadow-*)` in `@theme inline`, consumed as `drop-shadow-icon-sm`. Tailwind parses drop-shadow theme values at build time, so this is accepted **only if** the compiled CSS yields an equivalent `filter` and the computed-style diff (Decision 7) shows no change. If not, the four pairs stay as `dark:` and are listed as documented exceptions — no hacks to force it. Shadows contain no palette color utility, so the token-rules test is unaffected either way.

**Outcome (implementation):** accepted. Tailwind 4.3.3 compiles `drop-shadow-icon-sm` to `filter: drop-shadow(var(--icon-shadow-sm))` with no parsing of the value. `drop-shadow()` cannot take `none`, so the dark value of `icon-xs` is a fully transparent shadow (`0 0 0 oklch(0% 0 0 / 0)`): it paints nothing, so the result is pixel-identical, but its computed `filter` reads `drop-shadow(…)` instead of `none` — the one expected difference in the computed-style diff.

### 5. Documented exceptions

- **ThemeToggle lamp** (`text-amber-400` + amber glow → `dark:text-gray-400 dark:drop-shadow-none`): a lit/unlit state indicator, not a role color; the `theme-toggle` capability defines it in terms of `dark:` variants. It is the only palette color left and the only entry in the test's allowlist.
- **Icon drop-shadows**: would have been exceptions only if Decision 4 failed; it passed, so they are tokens.

### 6. Guard test: a plain Jest test over the source files

`apps/web/__tests__/designTokens.test.ts` (`@jest-environment node`) reads the files with `fs`:

1. **No palette colors:** every `.tsx` under `src/app/` and `src/components/` is scanned with a regex for `(bg|text|border|ring|ring-offset|from|via|to|fill|stroke|outline|divide|decoration|placeholder|caret|shadow)-(white|black|<hue>-<shade>)`, with any variant prefix. Matches outside a small allowlist (file + class, for the lamp) fail with the file and class.
2. **No orphan tokens:** the raw token names are parsed from the `:root` block of `globals.css`; each must appear as a utility fragment (`-<token>`) or `var(--<token>)` in some other file under `src/`.

Category icons are unaffected: their colors are SVG `fill` attributes, not Tailwind classes. Comparing against the design-system table was considered and rejected — parsing Markdown makes the test brittle, and the table is kept in sync by review.

- _Alternative — an ESLint rule (e.g. `eslint-plugin-tailwindcss` restrictions):_ more setup, and the orphan-token check still needs a test. A test file keeps both rules in one place with zero dependencies.

### 7. Verification: computed-style diff, not eyeballing

A disposable Playwright script (in the scratchpad, never committed) loads each reachable page in both themes at desktop and mobile widths, and records for every element its computed `color`, `background-color`, `background-image`, `border-*-color`, `box-shadow`, `outline-color`, and `filter`. It runs once on the base commit and once after the refactor; the diff must be empty. Hover states are captured by hovering each interactive element. States that cannot be reached in a normal page load (route `loading.tsx`, `error.tsx`) are checked by reviewing their class mapping against the tables above.

- The baseline is captured from the base commit before any edit — or from a `git worktree` of it if another server is using the working tree's `.next`.
- Before any build, E2E run, or server start, check `ss -tlnp | grep -E ':(3000|3001) '`. A server that is not ours means: stop and ask the user. Only one agent runs builds/E2E at a time — a parallel build overwriting `.next` under a running `next dev` is a known source of false failures.

**Outcome (implementation).** No other server was running, so the baseline came from the unmodified working tree (`next dev` on :3100, API on :3101). Colors are normalized to the sRGB bytes the browser paints before comparing, and transitions are disabled; two baseline runs diffed to zero. The final computed-style diff showed no mapping error — only three notation-level effects:

1. `icon-xs` in dark mode: `filter: drop-shadow(transparent)` instead of `none` (expected, Decision 4).
2. Gradients from `nav-surface` serialize as `linear-gradient(to left, …)` instead of `… in oklab, …`: with an `oklch` stop, oklab is already the default interpolation space, so Chrome omits it; the gradient is the same.
3. Translucent white (`white/N` tokens) and white text differ by at most 2/255 per channel in a screenshot pixel comparison, in anti-aliased edges and `white/5`–`white/10` fills. Tailwind's `bg-white/10` is `color-mix(in oklab, #fff 10%, transparent)`, whose float coordinates no literal color reproduces; an experiment writing white/black as hex removed the light-mode differences but still left ≤2/255 in dark mode. These are rounding differences far below the visible threshold (~3–5 levels), so the `oklch()` decision stands.

## Risks / Trade-offs

- [`oklch` copies drift from Tailwind's palette on a future Tailwind upgrade] → Intentional: tokens are now the source of truth and must not shift silently with a dependency bump. The design-system table records the origin of each value.
- [Hex → oklch rounding changes the nav surface by one sRGB step] → The implementation verifies the round-trip; if it fails, it increases the precision.
- [Snapshot churn hides an unintended markup change] → Snapshots must differ only in `className` strings; the reviewer checks the `.snap` diff for any non-class change.
- [32 tokens reads as over-engineered] → Accepted for a pixel-identical step; the core/legacy split tells new code which to use, and the legacy table is the consolidation plan.
- [The regex guard misses a dynamically built class (e.g. `` `text-${color}-500` ``)] → Tailwind cannot compile such classes either, so the codebase does not use them; the reviewer flags any that appear.

## Migration Plan

Single change, no data or API impact. Rollback is a revert of the commit. No follow-up is required for the app to keep working; the consolidation pass is optional.

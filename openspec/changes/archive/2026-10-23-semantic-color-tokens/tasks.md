# Tasks

Before any build, E2E run, or server start in this change: run `ss -tlnp | grep -E ':(3000|3001) '`. If a server is running that this agent did not start, stop and ask the user — never kill it. Only one agent runs builds/E2E at a time.

## 1. Baseline capture (before any code change)

- [x] 1.1 Write the disposable computed-style capture script described in design.md Decision 7 in the scratchpad (not in the repo): every element's computed `color`, `background-color`, `background-image`, `border-*-color`, `box-shadow`, `outline-color` and `filter`, plus the same after hovering each interactive element, for `/`, `/co2-emissions/`, `/water-footprint/` and a non-existent route, in light and dark themes, at 1280×720 and 390×844. Verify it produces a non-empty JSON per page/theme/viewport.
- [x] 1.2 Start web (`next dev`) + API on non-default ports from the tree before any code change (no other server was running, so a separate worktree was unnecessary) and save the baseline capture, including hover and keyboard-focus states. Verify the baseline files exist and the dark captures differ from the light ones (proves the theme switch is exercised), and two consecutive captures diff to zero (proves determinism).

## 2. Token layer in `globals.css`

- [x] 2.1 Add the raw color variables from the design.md Decision 3 tables (core and legacy) to `apps/web/src/app/globals.css` — light values on `:root`, dark values under `.dark` — in `oklch()`, copying Tailwind 4.3.3 palette values verbatim and annotating each with its palette origin. Expose them through a `@theme inline` block as `--color-<token>: var(--<token>)`. Verify the tokens compile (Tailwind compile of the token utilities; the full `nx build web` runs in 6.2, after the dev server used for the capture is stopped, so the build never overwrites a running `.next`).
- [x] 2.2 Replace `--color-nav-surface` / `--color-nav-surface-dark` with the single switching `nav-surface` token using the oklch values from design.md. Verify with a quick script that both oklch values convert back to `#eaecef` and `#1a1a1a` exactly (raise precision if not).
- [x] 2.3 Prototype the icon drop-shadow tokens (design.md Decision 4) on one consumer. Accept them only if the compiled CSS yields an equivalent `filter` in both themes; otherwise drop the shadow tokens and keep those four pairs as documented `dark:` exceptions. Record the outcome in the change's design.md (Decision 4 and 5) before continuing.

## 3. Migrate components and pages

- [x] 3.1 Migrate layout and pages: `app/layout.tsx` (body and skip link), `app/page.tsx`, `app/[category]/page.tsx`, `app/[category]/loading.tsx`, `app/not-found.tsx`, `app/error.tsx` — every palette color utility becomes its token utility per the design tables. Verify `npx nx test web` passes after updating only the affected snapshots, and the `.snap` diff contains only `className` changes.
- [x] 3.2 Migrate navigation: `Navbar.tsx`, `NavLink.tsx`, `NavScrollContainer.tsx`, `MobileHeader.tsx`, `BrandText.tsx`, `ThemeToggle.tsx` (everything except the lamp, the documented exception). Update the class assertions in `__tests__/components/NavLink.test.tsx` (`well` / `well-active`) and `__tests__/components/BrandText.test.tsx` (`accent`). Verify `npx nx test web` passes with only `className` changes in snapshots.
- [x] 3.3 Migrate water-footprint: `WaterFootprintTable.tsx` (table, cards, filter chips including checked state and focus ring/offset) and `WaterFootprintContent.tsx`. Verify `npx nx test web` passes with only `className` changes in snapshots.

## 4. Guard test

- [x] 4.1 Add `apps/web/__tests__/designTokens.test.ts` as described in design.md Decision 6 (no palette color utilities outside the lamp allowlist; no orphan tokens), using `it(...)` inside `describe(...)`. Verify it passes on the migrated code, and that it fails with a clear file/class or token message when a `dark:text-gray-400` is temporarily added to a component or an unused token to `globals.css` (revert both afterwards).

## 5. Documentation

- [x] 5.1 Update `docs/design-system.md`: rewrite Theme Rules to describe the token mechanism (`:root` / `.dark` raw variables, `@theme inline`, one utility per role, libraries read `var(--<token>)`, no palette color utilities in `src/app/` or `src/components/`, enforced by `designTokens.test.ts`); add the core and legacy token tables (token, role, light, dark) matching `globals.css`, stating that new UI uses the core set; list the documented exceptions. Fix the stale nav-surface mentions in Typography and Layout. Keep the chart Color Palettes sections pending. Verify every token in `globals.css` appears in the tables with identical values.
- [x] 5.2 Update `docs/technical/libraries.md`: the "Design tokens" row of _Current stack_ now describes the token system, and the "Prefer a token bridge" trap points to it (chart tokens follow the same `:root` / `.dark` + `@theme inline` pattern). Verify no remaining mention of `--color-nav-surface-dark` or "effectively none" in `docs/`.
- [x] 5.3 Add one sentence to `AGENTS.md` under "Presentation docs for UI-bearing changes": colors come from the semantic tokens in `docs/design-system.md`, never palette utilities, and `designTokens.test.ts` enforces it. Agent definitions are not changed (they already defer to the design system). Verify the sentence is present and no theming facts were duplicated elsewhere.

## 6. Integration verification

- [x] 6.1 Build and start web + API from the working tree on the same non-default ports, run the capture script from 1.1 again and diff it against the baseline. Verify the diff is empty in both themes and both viewports, including hover states; review the class mapping of `loading.tsx` and `error.tsx` against the design tables, since the script cannot reach them.
- [x] 6.2 Run the gates: `npm run lint`, `npm run build`, `npm run test`, and `npm run e2e` (includes `@axe-core/playwright` contrast checks and the filter-chip computed-color test). Verify all pass with zero errors or warnings.
- [x] 6.3 Run `npx openspec validate semantic-color-tokens --strict` and verify it passes.

# Tasks: Fix Water Footprint Filter Active State, Focus Visibility, and Footnote Spacing

> All code, tests, and test descriptions in English. Jest tests use `it()`, Playwright E2E uses `test()`. Tests must produce zero errors and zero warnings. No commit/push tasks — the workflow stops at the mandatory user-approval checkpoint (AGENTS.md SDD step 5).

---

## Task Group 1 — Component fixes

### [x] 1.1 Scope each filter radio+label pair in its own wrapper div

In `apps/web/src/components/water-footprint/WaterFootprintTable.tsx` (lines 82–104):

- Replace the `<Fragment key={category}>` wrapper with a plain `<div key={category}>` around each input+label pair.
- Remove the now-unused `Fragment` import from the React import.
- Keep everything else per pair unchanged: `id`/`name`/`value`/`checked`/`onChange` on the input, `htmlFor` and all existing label classes (the `peer-checked:*` set stays exactly as-is — per-pair scoping now makes it correct).

**Verification:** `npx nx build web` compiles; `npx nx test web` — the existing `WaterFootprintTable` suite passes except the snapshot (expected — regenerated in Task 2.3).

### [x] 1.2 Add visible focus styling to the filter labels

On the same labels, add `peer-focus-visible:` focus-ring utilities (e.g. `peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700` — final ring style per design review, but it MUST be clearly visible against both light and dark themes).

**Verification:** manual keyboard check — `npx nx dev web`, open `/water-footprint/`, Tab into the filter group: exactly the focused chip shows a ring; arrow keys move the ring one chip at a time; mouse clicks do not show the ring (`:focus-visible` semantics).

### [x] 1.3 Add bottom margin to the equivalents footnote

In `apps/web/src/components/water-footprint/WaterFootprintContent.tsx` (line 36): add `mb-8` to the footnote paragraph's `className` (keeping `mt-6` and the existing text/color classes).

**Verification:** manual check at both breakpoints on `/water-footprint/` — mobile (< `lg`): clear whitespace between the footnote and the fixed bottom nav; desktop (≥ `lg`): clear whitespace between the footnote and the viewport bottom.

---

## Task Group 2 — Unit tests and snapshot

### [x] 2.1 Add structural scoping test (per-pair peer isolation)

In `apps/web/__tests__/components/water-footprint/WaterFootprintTable.test.tsx`, add a test asserting the DOM structure that prevents the bleed: for each of the five labels, the label and its associated input (matching `htmlFor` ↔ `id`) share a wrapper element that contains exactly those two elements (one input, one label) — i.e. no wrapper contains more than one pair, and no input/label sits directly in the fieldset's flex container.

**Verification:** `npx nx test web` — new test green, zero warnings; sanity-check the guard by temporarily reverting to flat siblings (the test must fail).

### [x] 2.2 Add exactly-one-checked test

In the same file, add a test that, after `fireEvent.click` on each of the five radio options in turn, exactly the corresponding radio has `checked` and exactly one radio is checked at any time.

**Verification:** `npx nx test web` — green, zero warnings.

### [x] 2.3 Regenerate the WaterFootprintTable snapshot and visually diff it

- `npx nx test web -- --updateSnapshot`
- `git diff apps/web/__tests__/components/water-footprint/__snapshots__/WaterFootprintTable.test.tsx.snap` — confirm the ONLY changes are the five new wrapper `<div>`s and the new `peer-focus-visible:*` label classes. Any other diff is an unintended side effect → investigate before proceeding (AGENTS.md snapshot rule).

**Verification:** `npx nx test web` — the full suite (including the snapshot test) is green on the regenerated file.

---

## Task Group 3 — E2E regression coverage

### [x] 3.1 Add real-browser active-state regression test

In `apps/web/e2e/water-footprint.spec.ts` (Interaction describe), add a test:

- Desktop viewport, `page.goto('/water-footprint/')`.
- Read the five filter labels' computed `backgroundColor` — baseline assertion: exactly one label ("All") differs from the other four.
- Click the "Food & Beverages" radio.
- Assert exactly one label (the "Food & Beverages" label) carries the active background and the other four share the idle background.
- Keep it theme-robust: compare the labels' computed backgrounds against each other rather than hardcoding color values (the active `emerald-700` is theme-invariant; the idle background differs per theme — relative comparison avoids oklch/hex brittleness).

**Verification:** `npm run e2e` — new test green on all configured projects; sanity-check the regression guard by temporarily reverting the wrapper fix (the test must fail — jsdom-based suites cannot catch this bug, only the real browser can).

---

## Task Group 4 — Gates

### [x] 4.1 Run all gates

- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run e2e`

**Verification:** all four gates green with zero errors and zero warnings. Then stop at the mandatory user-approval checkpoint (AGENTS.md SDD step 5) — no commit, no push.

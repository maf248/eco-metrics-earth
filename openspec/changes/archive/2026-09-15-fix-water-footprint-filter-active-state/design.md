# Design: Fix Water Footprint Filter Active State, Focus Visibility, and Footnote Spacing

## Root Cause Analysis

### Bug 1 — active-state bleed across filter labels

`WaterFootprintTable.tsx` (lines 82–104) renders the five filter options as:

```tsx
{(['all', ...CATEGORIES] as const).map((category) => (
  <Fragment key={category}>
    <input ... className="peer sr-only" />
    <label htmlFor={inputId} className="... peer-checked:border-emerald-700 peer-checked:bg-emerald-700 peer-checked:text-white ..." />
  </Fragment>
))}
```

A React `<Fragment>` is a compile-time grouping construct — it renders **no DOM node**. The resulting DOM is a flat list inside `div.flex.flex-wrap.gap-2`:

```
div.flex
 ├─ input  (peer, sr-only)   ← "All"
 ├─ label  [for=all]
 ├─ input  (peer, sr-only)   ← "Food & Beverages"
 ├─ label  [for=food]
 ├─ … (3 more pairs)
```

Tailwind's `peer-checked:X` generates `.peer:checked ~ X` — the **general sibling combinator** (`~`), which matches every following sibling, not just the adjacent one. With all ten elements flat siblings:

- "All" checked (first input) → `~` reaches all five labels → all five paint green. This is the initial-load symptom.
- "Food & Beverages" checked (second input) → reaches the four following labels → everything green except "All".

The data filtering was never affected — `checked`/`onChange` are wired correctly; only the CSS state indicator is wrong. This is also why the bug shipped past unit tests: jsdom asserts attributes and class strings, not stylesheet combinator semantics (see Risk Assessment).

### Bug 2 — invisible keyboard focus

The radios are `sr-only` (correct — the label is the visual chip), but the label carries no `peer-focus-visible:` classes. A keyboard user tabbing into the group lands focus on an invisible element with zero visual feedback — a WCAG 2.4.7 (Focus Visible) failure. The fix needs the same per-pair scoping: with flat siblings, `peer-focus-visible:` would light up every following label exactly like `peer-checked:` does.

### Bug 3 — footnote flush against the bottom

`WaterFootprintContent.tsx` (line 36) renders the footnote as the last element of the page with `mt-6` and no bottom margin. The root layout's content wrapper (`app/layout.tsx` line 106) is `pb-20 lg:pb-0`:

- **Mobile:** `pb-20` (5rem) = exactly the fixed bottom nav's `h-20`. The padding exists to keep content *uncovered* by the nav — it is not breathing room below the content.
- **Desktop:** `pb-0` — nothing at all below the content.

So the footnote text ends flush against the nav bar (mobile) / viewport bottom (desktop).

## Technical Approach

### D1 — Per-pair wrapper `<div>` (chosen) vs state-driven conditional classes

**Decision: wrap each radio+label pair in its own `<div>`; keep the Tailwind `peer` idiom.**

```tsx
<div key={category}>
  <input ... className="peer sr-only" />
  <label htmlFor={inputId} className="… peer-checked:… peer-focus-visible:…" />
</div>
```

The wrapper scopes `~` to exactly one label per input — fixing the checked bleed and enabling correctly-scoped `peer-focus-visible` in the same stroke.

**Why not the obvious React-idiomatic alternative** — conditional classes from state (`className={filter === category ? activeClasses : idleClasses}`):

- **Spec mandate:** the original `water-footprint-table` spec requires the checked state to be indicated via Tailwind `peer`/`peer-checked` styling. The bug is in the DOM structure, not the idiom; the spec's intent (pure CSS reactivity) is preserved and the spec is amended to require the scoping the idiom actually needs.
- **Pure CSS reactivity:** `peer-checked`/`peer-focus-visible` track the *actual* input state (`:checked`, `:focus-visible`) directly in CSS. State-driven classes track React state — equivalent for `checked` here, but `:focus-visible` (keyboard-only focus, distinguishing `Tab` from pointer clicks) is a browser pseudo-class that React state cannot see without extra `onFocus`/`onBlur` + heuristics plumbing. Reimplementing `:focus-visible` in JS would be strictly worse.
- **One mechanism for both bugs:** the wrapper fixes Bug 1 and unlocks Bug 2's fix simultaneously.

**Semantic impact: none.** Radio-group semantics and arrow-key navigation come from the shared `name` attribute, not DOM adjacency; the `<fieldset>`/`<legend>` grouping is untouched; a `<div>` wrapping one input+label pair is a standard pattern. The outer `div.flex.flex-wrap.gap-2` keeps its classes — the per-pair wrappers simply become its flex items (visually identical: same gap, same wrap behavior, same chip appearance).

### D2 — Keep native radios (chosen) vs `aria-pressed` toggle buttons

The user phrased the expectation as "toggle" behavior, but the actual requirement is *visual single-active state*, not toggle semantics. Native radios already provide:

- **Single-select semantics** — checking one option unchecks the others natively; a toggle-button group would need `aria-pressed` plus JS exclusivity logic.
- **Arrow-key group navigation** — radios move focus/selection with ←/→/↑/↓ within the group; a button group needs a roving-tabindex implementation to match.
- **Checked state exposed to AT** — `input[type=radio]:checked` is natively announced; `aria-pressed` buttons must maintain the attribute manually and risk drift.

The original spec explicitly chose radios ("No custom ARIA widget roles") and this change keeps that decision. The single-active visual the user expects is delivered by correct `peer` scoping (D1).

### D3 — Footnote bottom margin: `mb-8`, scoped to the footnote paragraph

- **`mb-8` (2rem)** is consistent with the section's spacing scale (`mt-6` intro margin, `mb-6` fieldset/status margins) — deliberate breathing room, not an arbitrary value.
- **Scoped to the footnote `<p>` in `WaterFootprintContent.tsx`** rather than touching `app/layout.tsx`'s `pb-20 lg:pb-0`: the layout padding has a precise job (offsetting the fixed nav so content is not *covered*); inflating it would add dead space below every page's content on all 12 category pages. The footnote is the last element only on this page — the margin belongs to it.
- The exact value may be retouched by design review (the `mb-6`–`mb-10` range all satisfy the intent); the spec requires "bottom spacing (e.g. `mb-8`)" so the precise value is an implementation detail within that intent.

### Snapshot impact

The DOM change (wrapper `<div>`s around each pair, plus the new `peer-focus-visible:*` label classes) intentionally changes the `WaterFootprintTable` snapshot (`apps/web/__tests__/components/water-footprint/__snapshots__/WaterFootprintTable.test.tsx.snap`). Per AGENTS.md: regenerate via `npx nx test web -- --updateSnapshot`, then **visually diff the `.snap` file** to confirm the only changes are the five new wrapper `<div>`s and the new label classes — any other diff is an unintended side effect and must be investigated before proceeding. `WaterFootprintContent.test.tsx` has no snapshot (its assertions are text-based), so no other snapshot is affected.

### State management

No state changes. The `useState` filter/sort, derived `visibleRows`, live-region text, and all handler logic are untouched — this is a DOM-structure + CSS-class-only change (plus one margin class in a server component).

## Alternatives Considered

| Alternative | Rejected because |
|---|---|
| State-driven conditional classes (`filter === category ? …`) | See D1 — loses `:focus-visible` purity, contradicts the spec's peer idiom, duplicates state into class strings |
| `aria-pressed` toggle buttons | See D2 — reimplements single-select, arrow-key navigation, and checked-state announcement that radios provide natively |
| Adjacent-sibling styling without a wrapper (relying on `+`) | Tailwind's `peer` variant generates the general-sibling combinator `~` and offers no adjacent-sibling peer form; emulating `+` via arbitrary variants would be a non-standard hack (AGENTS.md: "if it feels hacky, it probably is") |
| Wrapping each pair in a `<span>` instead of a `<div>` | Equivalent scoping; `<div>` is the conventional flex-item wrapper and matches the existing `div.flex` container pattern. Either satisfies the spec's "own wrapper element" — `<div>` chosen for consistency |
| Adding bottom padding to the layout (`pb-28 lg:pb-8`) | See D3 — global blast radius (all 12 category pages), conflates the nav-offset job with breathing room |

## Risk Assessment

- **Low risk overall** — two className/DOM-scoping edits and one margin class; no logic, data, or contract changes.
- **Snapshot churn** — intentional; mitigated by the visual-diff task (any unexpected diff is investigated before commit).
- **E2E assertion fragility** — asserting a hardcoded background color would be brittle (Tailwind v4 colors resolve to oklch strings). The E2E test compares the five labels' computed backgrounds *against each other* (exactly one differs from the other four) — fully theme-robust, since the active `emerald-700` background is theme-invariant while the idle background differs per theme (`bg-white` vs `dark:bg-gray-800`). Relative comparison avoids hardcoding any color value.
- **jsdom blind spot (why the bug shipped)** — jsdom does not apply stylesheet combinator semantics, so unit tests can never catch a `~` bleed directly. Mitigated from two sides: a **structural** unit test (per-pair wrapper isolation — the DOM precondition for correct `~` scoping) and a **real-browser** E2E test (computed styles after click — the actual visual outcome).
- **Focus-ring visibility in dark mode** — the chosen `peer-focus-visible:` utilities must be clearly visible against both themes; verified manually in Task 1.2 before regenerating the snapshot.

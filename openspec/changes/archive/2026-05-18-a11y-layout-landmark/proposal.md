## Why

The skip-to-content link in `layout.tsx` targets `<div id="main-content">`, a generic wrapper, rather than the `<main>` landmark itself. Screen readers and keyboard users expect focus to land on the `<main>` element — the correct ARIA landmark — not an anonymous div. This misalignment means assistive technology announces focus incorrectly on the home and category pages.

## What Changes

- Remove `id="main-content"` and `tabIndex={-1}` from the layout `<div>` wrapper in `apps/web/src/app/layout.tsx`; keep only the offset layout classes.
- Add `id="main-content"` and `tabIndex={-1}` to the `<main>` element in `apps/web/src/app/page.tsx`.
- Add `id="main-content"` and `tabIndex={-1}` to the `<main>` element in `apps/web/src/app/[category]/page.tsx`.
- `apps/web/src/app/not-found.tsx` already has `<main id="main-content">` — verify and leave as-is.
- Update `apps/web/__tests__/app/layout.test.tsx` to assert `id` on `<main>` rather than the wrapper `<div>`.
- Update affected snapshot files.

## Capabilities

### New Capabilities

_(none — this is a correctness fix, not a new capability)_

### Modified Capabilities

- `skip-to-content`: The skip link's focus target changes from a `<div>` wrapper to the `<main>` landmark. The behaviour (bypass navigation) is unchanged, but the semantic target is now correct.

## Non-Goals

- Adding ARIA live regions or other landmark changes — out of scope.
- Changes to the Navbar, NavLink, or any non-layout component.
- Changes to the API app or shared package.
- Visual changes of any kind.

## Impact

- `apps/web/src/app/layout.tsx` — remove `id` and `tabIndex` from wrapper div.
- `apps/web/src/app/page.tsx` — add `id="main-content"` and `tabIndex={-1}` to `<main>`.
- `apps/web/src/app/[category]/page.tsx` — add `id="main-content"` and `tabIndex={-1}` to `<main>`.
- `apps/web/__tests__/app/layout.test.tsx` — assertion update.
- Snapshot files for layout, page, and category page updated.

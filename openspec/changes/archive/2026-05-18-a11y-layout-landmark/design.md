## Context

The root layout in `apps/web/src/app/layout.tsx` renders a "Skip to main content" anchor whose `href="#main-content"` targets a `<div id="main-content" tabIndex={-1}>` wrapper that wraps the page slot. When activated by keyboard or assistive technology, focus jumps to that `<div>` rather than to the `<main>` landmark.

The ARIA Authoring Practices Guide specifies that skip-link targets should be landmarks (`<main>`, `<nav>`, etc.) or `<h1>` elements — not generic containers — so that screen readers announce the correct role after focus transfer. Using a `<div>` as target means a screen reader announces "group" or nothing meaningful, instead of "main".

`apps/web/src/app/not-found.tsx` already has `<main id="main-content">` and is not affected. The fix touches only `layout.tsx` (to remove the misplaced `id`/`tabIndex`) and the two pages that render the `<main>` slot: `page.tsx` and `[category]/page.tsx`.

## Goals / Non-Goals

**Goals:**
- Move `id="main-content"` and `tabIndex={-1}` from the layout wrapper `<div>` onto the `<main>` element inside each page.
- Ensure every route that uses the root layout has a `<main id="main-content" tabIndex={-1}>` as the skip-link target.
- Update tests and snapshots to reflect the corrected DOM structure.

**Non-Goals:**
- Any visual change.
- Changes to the Navbar, NavLink, or any other component.
- Adding new ARIA landmarks, live regions, or roles.
- Changes to the API app or shared package.

## Decisions

### D1 — Place `id`/`tabIndex` on `<main>` in each page, not in `layout.tsx`
**Decision**: Remove `id="main-content"` and `tabIndex={-1}` from the layout `<div>` wrapper. Add them to the `<main>` element in `page.tsx` and `[category]/page.tsx`.  
**Rationale**: The layout does not render `<main>` directly — it renders a slot (`{children}`) that each page fills. The `<main>` element with the correct semantics lives in each page component. Adding the `id` at the layout level onto a `<div>` was the root cause of the bug.  
**Alternative considered**: Wrap `{children}` in a `<main id="main-content">` inside `layout.tsx` — rejected because it would add an extra layout-level `<main>`, and pages already render their own `<main>`, which would create nested `<main>` elements (invalid HTML).

### D2 — `tabIndex={-1}` is required on the skip-link target
**Decision**: Keep `tabIndex={-1}` on the `<main>` element.  
**Rationale**: Without `tabIndex={-1}`, `element.focus()` triggered by the skip link will not move browser focus in all browsers (notably Safari). The element must be programmatically focusable even though it is not in the natural tab order.

## Risks / Trade-offs

- **[Risk] Future pages added to the app do not add `id="main-content"` to their `<main>`** → The skip link would silently stop working for those routes. Mitigation: document the convention in AGENTS.md (as part of the "Adding a new page" checklist).
- **[Trade-off] Cannot enforce the `id` at the layout level** — we accept this because nested `<main>` elements are worse for accessibility than a correctly scoped `id` per page.

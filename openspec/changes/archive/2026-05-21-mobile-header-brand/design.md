## Context

The app currently has a fixed bottom nav bar on mobile and a fixed left sidebar on desktop. The sidebar brand (`eco-metrics earth` logo + text, linked to `/`) is hidden on mobile via `hidden lg:flex`. On mobile there is no visual indicator of the site name and no way to navigate back to home.

The new `MobileHeader` must coexist with the existing bottom nav (`h-20`, `fixed bottom-0`) and the desktop sidebar (`lg:w-64`, `fixed left-0`). It must be `lg:hidden` so it never appears on desktop. The content area currently uses `pt-20` in `<main>` to push below the header — this must be adjusted to also clear the new top header height.

Current fixed UI zones on mobile:
- **Top**: nothing (free)
- **Bottom**: `h-20` bottom nav

After this change:
- **Top**: `h-14` mobile header (new)
- **Bottom**: `h-20` bottom nav (unchanged)

## Goals / Non-Goals

**Goals:**
- Provide a semantic `<header role="banner">` landmark with an accessible `<a href="/">` home link on mobile
- Display site logo (`SiteLogoIcon`) + brand text with a terminal-style blinking cursor
- Pure CSS animation — no JS timers, no `setInterval`, no hydration mismatch risk
- Match the dark palette of the existing nav (`bg-black`, `border-gray-800`, `text-emerald-400`)
- Zero visual impact on desktop (strictly `lg:hidden`)
- Fully accessible: visible text label for screen readers, correct landmark semantics

**Non-Goals:**
- No hamburger/drawer menu
- No desktop header changes
- No JS-driven animation

## Decisions

### 1. Component boundary: new `MobileHeader.tsx` (not inline in layout)

**Decision:** Extract into its own component file.
**Rationale:** `layout.tsx` is a Server Component — keeping it clean and delegating the animation markup to a dedicated component makes testing and future changes easier. `MobileHeader` itself is a pure presentational Server Component (no client hooks needed — CSS animation requires no JS).
**Alternative considered:** Inline HTML in `layout.tsx`. Rejected because it makes the layout harder to test and violates single-responsibility.

### 2. Animation: CSS `@keyframes` in `globals.css`, not Tailwind arbitrary values

**Decision:** Define a `cursor-blink` keyframe in `globals.css` and apply it via a Tailwind `animate-[cursor-blink]` arbitrary class or a custom utility class.
**Rationale:** A `step-end` timing function (not `ease` or `linear`) is what makes a cursor look realistic — it snaps between visible and invisible rather than fading. This cannot be expressed with Tailwind's built-in `animate-pulse` (which uses opacity with ease). A named keyframe in globals.css is the cleanest solution.
**Alternative considered:** `animate-pulse` — rejected because it fades (unrealistic). JS `setInterval` toggling a class — rejected because it causes hydration mismatch in SSR and adds unnecessary complexity.

### 3. Cursor character: a `<span>` with `aria-hidden="true"`

**Decision:** Render the blinking cursor as `<span aria-hidden="true">▋</span>` (or `|`) after the brand text.
**Rationale:** The cursor is purely decorative. `aria-hidden` prevents screen readers from announcing it. The accessible name of the link comes from the visible text + logo `alt` — the cursor does not add meaning.

### 4. Header height: `h-14` (56px)

**Decision:** Use `h-14` for the header.
**Rationale:** Compact enough to not dominate the viewport on small screens (320px+), tall enough to comfortably fit the logo (32px) and text. Combined with the `pb-20` bottom nav, total fixed UI overhead is 76px — leaves ample content area even on iPhone SE.
**Consequence:** `<main>` top padding must be updated from `pt-20` (80px) to `pt-14` (56px) since the header now creates the visual offset, and content should sit just below the header.

### 5. Semantic structure: `<header>` wrapping a single `<Link>`

**Decision:**
```html
<header aria-label="Site header">
  <Link href="/" aria-label="eco-metrics earth — go to home">
    <SiteLogoIcon aria-hidden />
    <span aria-hidden="true">~ eco-metrics.earth</span>
    <span aria-hidden="true">▋</span>  <!-- cursor -->
  </Link>
</header>
```
**Rationale:** `<header>` provides the `banner` landmark. The `<Link>` wraps the entire brand unit so the whole header is tappable (better touch target). `aria-label` on the link provides a clean, unambiguous accessible name that ignores the decorative cursor. The visible text `~ eco-metrics.earth` is `aria-hidden` because the link's `aria-label` already describes the destination — prevents double-announcement.

## Risks / Trade-offs

- **`pt-14` vs `pt-20` change in `<main>`**: Pages currently use `pt-20` as a visual breathing room offset. Changing to `pt-14` means the header now provides that spacing structurally. If the header is ever removed, pages will need their padding restored. → Mitigation: document the dependency in a comment.
- **CSS keyframe in globals.css**: Adding a keyframe to the global stylesheet is a minor global side-effect. Since it's a named animation (`cursor-blink`) it won't conflict with anything. → Low risk.
- **`step-end` timing and `prefers-reduced-motion`**: Blinking animations can be problematic for users with vestibular disorders. → Mitigation: wrap animation in `@media (prefers-reduced-motion: no-preference)` so it only runs when the user has not requested reduced motion. When reduced motion is preferred, the cursor renders as static visible text.

## Migration Plan

1. Add `@keyframes cursor-blink` to `globals.css`
2. Create `MobileHeader.tsx`
3. Add `<MobileHeader />` to `layout.tsx` above `<Navbar />`; update offset comment
4. Update `pt-20` → `pt-14` in `page.tsx` and `[category]/page.tsx`
5. Write tests for `MobileHeader`; update affected snapshots
6. Manual visual check on iPhone 14 Pro Max (430px) and Samsung Galaxy S8+ (360px) viewports

Rollback: revert the 5 changed files — no database migrations, no API changes.

---

## Amendment: Typewriter animation + `[↵]` affordance

### Context update

The static brand text is replaced by a typewriter animation that runs once on mount, character by character, giving the header a terminal "command being typed" feel. After typing completes, a `[↵]` indicator fades in to communicate that the element is interactive (clickable/tappable).

### Decision 6: `MobileHeader` becomes a Client Component

**Decision:** Add `'use client'` to `MobileHeader.tsx` and use `useState` + `useEffect` for the typewriter loop.
**Rationale:** CSS-only typewriter tricks exist (using `steps()` on `width`) but they are extremely fragile with variable-length text and break with font-size changes. A `useEffect`-driven character-by-character reveal is robust, testable, and straightforward. The component is already leaf-level (no children), so marking it client has no cascading cost.
**Alternative considered:** CSS `@keyframes` with `steps(N)` on `max-width` — rejected because it requires hardcoding the character count and pixel width, making it brittle.

### Decision 7: Typewriter runs once on mount, respects `prefers-reduced-motion`

**Decision:** On mount, `useEffect` starts an interval that appends one character every ~60ms until the full string `~ eco-metrics.earth` is displayed. If `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is true, skip the animation and show the full text immediately.
**Rationale:** 60ms per character gives a natural typing speed (~16 chars/sec). The full string is 20 chars → ~1.2s total. This feels snappy without being rushed.
**Timing:** interval clears itself when all characters are typed. Cleanup on unmount prevents memory leaks.

### Decision 8: `[↵]` affordance fades in after typing completes

**Decision:** Render `<span aria-hidden="true">[↵]</span>` with `opacity-0` initially, transitioning to `opacity-100` when `isTypingDone` state becomes true. Use Tailwind `transition-opacity duration-500`.
**Rationale:** The `↵` symbol is universally understood as "execute/go" in terminal contexts. Fading it in after typing completes creates a natural sequence: type → done → "press enter". `aria-hidden` keeps it out of the accessibility tree — the link `aria-label` already communicates the destination.
**Color:** `text-emerald-400/60` (60% opacity) — slightly dimmer than the brand text to create visual hierarchy: brand text is primary, `[↵]` is secondary affordance.

### Risks update

- **Hydration mismatch**: Server renders empty string `''` for `displayedText`; client starts typing on mount. This is the standard SSR pattern for client animations — Next.js handles it correctly with `'use client'`.
- **`useEffect` cleanup**: The interval must be cleared on unmount and when typing completes to avoid setState on unmounted components.

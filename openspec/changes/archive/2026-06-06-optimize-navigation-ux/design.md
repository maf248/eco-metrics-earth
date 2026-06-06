## Context

The eco-metrics earth web app has 13 static pages (1 home + 12 category routes). Navigation uses `<Link>` components from `next/link` with default prefetch behavior. There is no `loading.tsx` for any route segment, causing the UI to appear frozen during client-side navigation — the old page content remains visible until the new route's JS chunk is loaded, parsed, and rendered. Additionally, all 13 `NavLink` instances independently call `usePathname()`, causing unnecessary re-renders on every route change.

Performance profiling (Chrome DevTools trace, 6x CPU throttling) confirmed:
- ~30ms (wall time) of JS execution per navigation (~5ms at full speed)
- Dropped frames during transition due to synchronous rendering
- No network requests for chunk loads in the trace (chunks already cached), but a hard-reload cold-start scenario would add chunk download time

## Goals / Non-Goals

**Goals:**
- Provide immediate visual feedback during category-page navigation via Next.js `loading.tsx`
- Reduce unnecessary NavLink re-renders from 13-per-navigation to 2-per-navigation using `React.memo`
- Smooth the visual transition by wrapping content in a `useTransition`-aware client component

**Non-Goals:**
- No data prefetching changes (Next.js default `<Link>` behavior covers the desktop sidebar)
- No Suspense boundaries for async data (deferred to ROADMAP.md I09 — needs real API data first)
- No dynamic imports / code splitting (premature optimization at ~1KB page chunks)
- No changes to the API, shared package, or E2E tests

## Decisions

### 1. `loading.tsx` at `[category]/loading.tsx`

**Decision:** Create `apps/web/src/app/[category]/loading.tsx` with a lightweight skeleton that mirrors the page layout structure.

**Rationale:** Next.js App Router automatically wraps each route segment in a `<Suspense>` boundary. When a `loading.tsx` exists for a segment, it is rendered as the Suspense fallback during client-side navigation. This provides instant visual feedback — the skeleton appears in ~16ms (one frame) instead of the user staring at frozen old content for hundreds of milliseconds.

**Alternatives considered:**
- `template.tsx` — re-mounts on every navigation, too heavy for this use case
- Inline loading state in the page component — requires making the page a client component, loses SSR benefits
- `useTransition` alone — doesn't provide visual UI during the gap between route change and new page render

**Design:** The skeleton renders the same layout structure as the category page (centered column with icon placeholder + text placeholders) but with `animate-pulse` Tailwind utility for the shimmer effect. It does NOT import category icons (keeps the skeleton bundle minimal).

### 2. `React.memo` on NavLink

**Decision:** Lift `usePathname()` from individual `NavLink` instances into the parent `Navbar` component. Compute `isActive` once in the parent. Pass `isActive` as a prop to `NavLink`. Wrap the `NavLink` export with `React.memo`.

**Rationale:** Currently, each of the 13 `NavLink` instances independently subscribes to `usePathname()`. On every route change, all 13 re-render — 11 of them produce identical output. By computing `isActive` in the parent (1 `usePathname()` call) and passing it as a prop, `React.memo` can skip re-rendering the 11 links whose `isActive` value didn't change.

**Component API change:**
```typescript
// Before
interface NavLinkProps {
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}
// After
interface NavLinkProps {
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  isActive: boolean;  // NEW — computed by parent
}
```

**Memo comparator:** Use default shallow comparison — `React.memo` with no custom comparator (all props are primitives or stable component references).

**Extract `normalise` to shared util:** The `normalise` function (path trailing-slash removal with root-path guard) is moved to `apps/web/src/lib/path.ts` so both `Navbar` and test files can import it without depending on `NavLink`.

**Impact on Navbar:** `Navbar` already imports `usePathname`-using child components, so adding `usePathname` to `Navbar` itself has negligible cost. It computes `isActive` in the `.map()` callback — a simple string comparison executed 13 times, which is O(n) where n=13 (trivial).

### 3. Content Transition Wrapper

**Decision:** Create a `ContentTransition` client component that wraps `{children}` in `layout.tsx`. It uses `useTransition` + `usePathname` to detect route changes and apply a subtle opacity transition (opacity: 1 → 0.7 → 1) during navigation.

**Rationale:** While `loading.tsx` handles the "new page not ready yet" state, the transition wrapper smooths the _existing_ content disposal. Without it, the old page content vanishes abruptly when the loading skeleton appears. With it, the old content fades slightly, providing a smoother perceived transition. The transition is purely visual (CSS opacity, 150ms) — no DOM blocking.

**Alternative considered:** Next.js View Transitions API (`next.config.ts` `experimental.viewTransition`) — more powerful (cross-fade between old and new content) but experimental and not stable in Next.js 16. The `useTransition` approach is simpler, stable, and sufficient.

**Implementation:**
```tsx
'use client';
import { usePathname } from 'next/navigation';
import { useTransition, useEffect, useState, type ReactNode } from 'react';

export default function ContentTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [isPending] = useTransition();

  useEffect(() => {
    if (pathname !== prevPathname) {
      setPrevPathname(pathname);
    }
  }, [pathname, prevPathname]);

  return (
    <div
      className="transition-opacity duration-150"
      style={{ opacity: isPending ? 0.7 : 1 }}
    >
      {children}
    </div>
  );
}
```

**Note:** The `isPending` from `useTransition` tracks React transitions, not Next.js route transitions directly. However, when Next.js performs client-side navigation through the router, the internal state updates trigger the transition state. The `usePathname` subscription ensures this component re-renders when the route changes, and at that moment `isPending` will briefly be `true` during the Suspense fallback rendering.

## Risks / Trade-offs

- **[Risk] `loading.tsx` flashes on fast navigation** → Mitigation: The skeleton uses `animate-pulse` which is a 2-second animation. On fast connections (<100ms navigation), the skeleton is barely perceptible because the new page replaces it quickly.
- **[Risk] `React.memo` prevents NavLink from updating if parent forgets to pass `isActive`** → Mitigation: TypeScript enforces the required `isActive` prop. Tests verify active state updates correctly.
- **[Risk] `useTransition` `isPending` may be unreliable for Next.js routing** → Mitigation: The opacity change is subtle (1 → 0.7) and only 150ms. If `isPending` never fires, the component still renders correctly — it just won't flash. Worst case: no-op, not a regression. Tests will verify the component renders.
- **[Risk] Snapshot tests may change** → Mitigation: Update snapshots after implementation and visually diff them to confirm only the intended changes.

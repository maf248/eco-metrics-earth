## 1. Fix Layout Wrapper

- [x] 1.1 In `apps/web/src/app/layout.tsx`, remove `id="main-content"` and `tabIndex={-1}` from the `<div>` wrapper that wraps `{children}`; keep all other classes intact

## 2. Fix Page Main Elements

- [x] 2.1 In `apps/web/src/app/page.tsx`, add `id="main-content"` and `tabIndex={-1}` to the `<main>` element
- [x] 2.2 In `apps/web/src/app/[category]/page.tsx`, add `id="main-content"` and `tabIndex={-1}` to the `<main>` element
- [x] 2.3 Verify `apps/web/src/app/not-found.tsx` already has `<main id="main-content">` — no change needed if correct

## 3. Update Tests and Snapshots

- [x] 3.1 Update `apps/web/__tests__/app/layout.test.tsx` — assert the wrapper `<div>` does NOT have `id="main-content"`, and that the test still passes
- [x] 3.2 Update or add assertions in `apps/web/__tests__/app/page.test.tsx` to confirm `<main id="main-content" tabIndex={-1}>` is present
- [x] 3.3 Update or add assertions in `apps/web/__tests__/app/[category]/page.test.tsx` to confirm `<main id="main-content" tabIndex={-1}>` is present
- [x] 3.4 Update any affected Jest snapshot files (`*.snap`) to reflect the corrected DOM

## 4. Verification

- [x] 4.1 Run `npx nx test web` — all tests pass with zero errors or warnings
- [x] 4.2 Run `npx nx build web` — build succeeds with no TypeScript errors
- [x] 4.3 Run `npm run lint` — no lint errors

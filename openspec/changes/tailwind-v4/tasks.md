## 1. Dependency Update

- [ ] 1.1 Check the latest stable version of `@tailwindcss/postcss` on npm and note the exact version
- [ ] 1.2 In root `package.json`: remove `tailwindcss` and `autoprefixer`; add `@tailwindcss/postcss` at the exact version from 1.1
- [ ] 1.3 Run `npm install` and verify no peer dependency errors

## 2. Build Tooling Migration

- [ ] 2.1 Replace `apps/web/postcss.config.js` content: remove `tailwindcss: {}` and `autoprefixer: {}` plugins; add `'@tailwindcss/postcss': {}`
- [ ] 2.2 Delete `apps/web/tailwind.config.ts`

## 3. CSS Configuration Migration

- [ ] 3.1 Replace `apps/web/src/app/globals.css` directives: remove `@tailwind base`, `@tailwind components`, `@tailwind utilities`; add `@import "tailwindcss";` at the top
- [ ] 3.2 Add `@custom-variant dark (&:where(.dark, .dark *));` to `apps/web/src/app/globals.css` to preserve class-based dark mode

## 4. Utility Class Audit & Fixes

- [ ] 4.1 Search `apps/web/src/**` for any deprecated v3 opacity utilities (`bg-opacity-*`, `text-opacity-*`, `border-opacity-*`, `ring-opacity-*`) and confirm zero matches
- [ ] 4.2 Clear build cache: `rm -rf apps/web/.next .nx/cache`
- [ ] 4.3 Run `npx nx build web` and fix any utility class errors or missing styles reported in the output

## 5. Verification

- [ ] 5.1 Run `npx nx run-many --target=test --all` — all 130 tests must pass with zero warnings
- [ ] 5.2 Run `npm run lint` — zero errors
- [ ] 5.3 Run `npx nx build web` — exits with code 0, no errors
- [ ] 5.4 Commit: `chore(deps): migrate tailwind css v3 to v4`

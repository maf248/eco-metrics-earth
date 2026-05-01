# Tasks: fix-tooling-and-types

## Group 1 — NX Tooling

- [x] 1.1 Add `"!{projectRoot}/jest.config.cts"` to the `production` namedInput array in `nx.json` (alongside the existing `jest.config.[jt]s` exclusion)
- [x] 1.2 Register `@nx/eslint/plugin` in the `plugins` array of `nx.json` with `lintTargetName: "lint"`
- [x] 1.3 Update `targetDefaults.lint.inputs` in `nx.json` to reference `"{workspaceRoot}/eslint.config.mjs"` instead of the legacy `.eslintrc.json` / `.eslintignore` entries
- [x] 1.4 Add `"@nx/react": "22.6.5"` to `devDependencies` in the root `package.json` (exact version, no `^`)
- [x] 1.5 Verify: run `npx nx lint web`, `npx nx lint api`, and `npx nx lint shared` — all must resolve a lint target and exit without "target not found" errors

## Group 2 — TypeScript Config

- [x] 2.1 Remove `"customConditions": ["@org/source"]` from `tsconfig.base.json`
- [x] 2.2 Add `"noUnusedParameters": true` to `tsconfig.base.json`
- [x] 2.3 Remove `"../../dist/apps/web/.next/types/**/*.ts"` from the `include` array in `apps/web/tsconfig.json`
- [x] 2.4 Verify: run `npx nx run-many --target=build --all` — all projects must compile without TypeScript errors (fix any `noUnusedParameters` violations found in existing source files by prefixing unused parameters with `_`)

## Group 3 — Jest / SWC Config

- [x] 3.1 Change `"module": { "type": "es6" }` to `"module": { "type": "commonjs" }` in `apps/api/.spec.swcrc`
- [x] 3.2 Change `"module": { "type": "es6" }` to `"module": { "type": "commonjs" }` in `packages/shared/.spec.swcrc`
- [x] 3.3 Verify: run `npx nx test api` and `npx nx test shared` — all tests must pass with zero `SyntaxError: Cannot use import statement` errors

## Group 4 — Code Quality

- [x] 4.1 Replace `apps/web/index.d.ts` content: add `import type { FC, SVGProps } from 'react'`, type the default export as `string`, type `ReactComponent` as `FC<SVGProps<SVGSVGElement>>`, and remove the `/* eslint-disable */` comment
- [x] 4.2 Add `import type { ReactNode } from 'react'` to `apps/web/src/app/layout.tsx` and replace `React.ReactNode` with `ReactNode` in the `children` prop annotation
- [x] 4.3 Remove `'**/*.js'` from the `ignores` array in `eslint.config.mjs`
- [x] 4.4 Add `/.opencode/package-lock.json` to `.gitignore`
- [x] 4.5 Run `git rm --cached .opencode/package-lock.json` to untrack the file from the repository (if it is currently tracked)
- [x] 4.6 Verify: run `npx nx run-many --target=lint --all` — all projects must pass lint with zero errors; check that no new `any` violations or unintended JS ignores are present

## Group 5 — Docs

- [x] 5.1 In `AGENTS.md`, update the dev command comment from `--target=serve` to `--targets=dev,serve`
- [x] 5.2 In `AGENTS.md`, update the Project Overview entry for `apps/web` from `Next.js 14+` to `Next.js 16+`
- [x] 5.3 Verify: review the updated AGENTS.md lines to confirm both corrections are accurate and no other stale version references remain

## Group 6 — Final Verification

- [x] 6.1 Run `npm run build` — must complete with zero TypeScript errors across all projects
- [x] 6.2 Run `npm run test` — must complete with zero test failures and zero `console.error` / `console.warn` outputs caused by configuration issues
- [x] 6.3 Run `npm run lint` — must complete with zero ESLint errors across all projects
- [x] 6.4 Confirm `.opencode/package-lock.json` is no longer listed in `git status` as a tracked file

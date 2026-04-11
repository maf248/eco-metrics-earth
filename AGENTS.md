# AGENTS.md - eco-metrics earth Development Guide

## Project Overview

eco-metrics earth is an environmental metrics dashboard monorepo built with NX.

- **Package manager:** npm (workspaces)
- **Runtime:** Node.js v20 LTS (see `.nvmrc`)
- **Monorepo tool:** NX v22
- **Apps:**
  - `apps/web` — Next.js 14+ App Router, TypeScript, Tailwind CSS (port 3000)
  - `apps/api` — NestJS, TypeScript — BFF with global prefix `/api/v1` (port 3001)
- **Packages:**
  - `packages/shared` — Shared TypeScript types (`@eco-metrics/shared`)
- **Testing:** Jest + Testing Library (web), Jest (api, shared)
- **Linting/Format:** ESLint + Prettier
- **Deploy targets:** Vercel (web), Railway (api)

---

## Development Workflow (SDD)

All non-trivial changes — new features, significant refactors, API contracts — **must follow the Spec-Driven Development (SDD) workflow**:

1. **Propose** — generate a proposal + specs + design + tasks using `openspec-propose` before writing any code.
2. **Review** — the user reviews and approves the OpenSpec artifacts in `openspec/changes/`.
3. **Implement** — code is written strictly based on the approved spec, delegated to `@coder`.
4. **Validate** — `@tester` writes/updates tests; `@reviewer` does the final quality audit.
5. **Close** — verify Definition of Done, then commit and optionally open a PR.

> Only small, self-contained fixes (typos, config tweaks, trivial one-liners) may skip the full SDD cycle. When in doubt, propose first.

---

## Build/Lint/Test Commands

```bash
# Development (starts both apps in parallel)
npm run dev
# or: npx nx run-many --target=serve --all --parallel

# Build all apps
npm run build
# or: npx nx run-many --target=build --all

# Run all tests
npm run test
# or: npx nx run-many --target=test --all

# Lint all projects
npm run lint
# or: npx nx run-many --target=lint --all

# Single app commands
npx nx serve web        # http://localhost:3000
npx nx serve api        # http://localhost:3001
npx nx test web
npx nx test api
npx nx test shared
npx nx build web
npx nx build api
```

---

## Code Style Guidelines

### Language

- **All code must be in English**: variable names, function names, class names, type names, comments, commit messages, PR titles and descriptions, and documentation.
- The only exception is conversational chat with the team, which may be in Spanish.

### Formatting

- **Formatter:** Prettier (v3)
- **Config:** `.prettierrc` at repo root
- Rules: `singleQuote: true`, `semi: true`, `tabWidth: 2`, `trailingComma: 'all'`
- Run: `npx prettier --write "**/*.{ts,tsx,js,json}"`

### TypeScript (if applicable)

- Use strict mode when possible
- Avoid `any` — prefer `unknown` with type guards when the type is uncertain
- Use explicit types for function parameters and return values
- Prefer interfaces for object shapes, types for unions/primitives

### Imports

- External imports first, then internal/workspace imports, then relative imports
- Use `@eco-metrics/shared` for shared types (path alias configured in `tsconfig.base.json`)
- Use `@/` alias for imports within `apps/web/src/`

### File Naming Conventions

- React components: `PascalCase.tsx` (e.g., `MetricsCard.tsx`)
- Utilities/helpers: `camelCase.ts` (e.g., `formatDate.ts`)
- NestJS: NX/Nest conventions — `kebab-case.controller.ts`, `kebab-case.service.ts`, `kebab-case.module.ts`
- Test files: `*.test.ts` or `*.test.tsx` inside a `__tests__/` folder at project root, mirroring the `src/` structure without the `src/` prefix (e.g., `src/health/health.controller.ts` → `__tests__/health/health.controller.test.ts`)

### Testing Conventions

- Always use `it('...')` instead of `test('...')` for individual test cases.
- Group related tests with `describe('...')` blocks.
- Test file names must match the source file: `foo.test.ts` for `foo.ts`.
- Test descriptions must be written in English and describe the expected behavior (e.g., `it('should return 404 when resource is not found')`).
- **Tests must produce zero errors and zero warnings.** A passing test that emits `console.error` or `console.warn` is not acceptable — the warning is a symptom of a real problem and must be fixed at the root.
- If a test warning or error appears, investigate the cause and apply the cleanest, most idiomatic fix (e.g., use the right render strategy, fix the component structure, use proper async handling). Do **not** suppress or silence output as a workaround.
- If the correct fix is unclear or multiple approaches exist, **ask before implementing** — prefer the most standard/best-practice solution.

### Git/Commit Conventions

- Uses [Conventional Commits](https://www.conventionalcommits.org/) enforced via Commitizen
- Format: `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Examples: `feat(metrics): add new chart widget`, `fix(api): resolve data fetch error`

#### Rules — for humans and AI agents alike

1. **Never commit without explicit request** — do not create a commit unless the user explicitly asks for it.
2. **Never push to `main` directly** — all changes to `main` must go through a Pull Request.
3. **Never push without confirmation** — always ask the user before running `git push`, regardless of the branch.
4. **Always use Commitizen format** — every commit message must follow `type(scope): description`. Free-form messages are not allowed.
5. **One logical change per commit** — keep commits atomic and focused.

---

## Project Structure

```
eco-metrics-earth/
├── apps/
│   ├── api/                     # NestJS BFF
│   │   └── src/
│   │       ├── app/             # AppModule, AppController, AppService
│   │       ├── health/          # HealthController (GET /api/v1/health)
│   │       ├── modules/         # Future: per-category eco modules
│   │       ├── common/          # Shared pipes, guards, interceptors, filters
│   │       ├── config/          # AppConfigService (typed env vars)
│   │       └── main.ts          # Bootstrap — port 3001, prefix /api/v1
│   └── web/                     # Next.js App Router
│       └── src/
│           ├── app/             # Routes, layouts, pages (App Router)
│           ├── components/      # Reusable UI components
│           ├── lib/             # Utilities and helpers
│           └── types/           # Frontend-local TypeScript types
├── packages/
│   └── shared/                  # @eco-metrics/shared
│       └── src/lib/
│           ├── api-response.ts  # ApiResponse<T> interface
│           └── eco-category.ts  # EcoCategory type + ECO_CATEGORIES const
├── .nvmrc                       # Node.js v20
├── nx.json                      # NX workspace config (cache, targets)
├── tsconfig.base.json           # Root TS config + path aliases
└── package.json                 # Root workspace (npm workspaces)
```

---

## Common Development Tasks

### Adding a new eco-category module (API)

1. Create `apps/api/src/modules/<category>/` folder
2. Add `<category>.module.ts`, `<category>.controller.ts`, `<category>.service.ts`
3. Import the new module into `AppModule`
4. Write smoke test in `__tests__/<category>/<category>.controller.test.ts`

### Adding a new shared type

1. Create the type file in `packages/shared/src/lib/`
2. Export it from `packages/shared/src/index.ts`
3. Both apps can now import from `@eco-metrics/shared`

### Running only affected projects

```bash
npx nx affected --target=test
npx nx affected --target=build
```

---

## Linting & Type Checking

```bash
# Lint all
npm run lint

# Type check via build
npx nx run-many --target=build --all

# Format check
npx prettier --check "**/*.{ts,tsx,js,json}"

# Format fix
npx prettier --write "**/*.{ts,tsx,js,json}"
```

Pre-PR checklist: `npm run lint` and `npm run build` must pass with zero errors.

---

## Engineering Principles

- **Always apply best practices.** Prefer idiomatic, well-established patterns over clever or novel solutions.
- **If it feels hacky, it probably is.** Before implementing a workaround, shortcut, or non-standard approach, stop and ask. There is almost always a cleaner solution.
- **Correctness over convenience.** Never silence, suppress, or work around an error/warning without understanding and fixing the root cause.
- **Ask when uncertain.** If two valid approaches exist and the tradeoffs are non-trivial, present the options and ask before proceeding.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

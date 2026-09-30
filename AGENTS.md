# AGENTS.md - eco-metrics earth Development Guide

## Project Overview

eco-metrics earth is an environmental metrics dashboard monorepo built with NX.

- **Package manager:** npm (workspaces)
- **Runtime:** Node.js v24 LTS (see `.nvmrc`)
- **Monorepo tool:** NX v23
- **Apps:**
  - `apps/web` — Next.js 16+ App Router, TypeScript, Tailwind CSS (port 3000)
  - `apps/api` — NestJS, TypeScript — BFF with global prefix `/api/v1` (port 3001)
- **Packages:**
  - `packages/shared` — Shared TypeScript types (`@eco-metrics/shared`)
- **Testing:** Jest + Testing Library (web), Jest (api, shared), Playwright (E2E)
- **Linting/Format:** ESLint + Prettier
- **Deploy targets:** Vercel (web), Cloud Run (api)

---

## Development Workflow (SDD)

All non-trivial changes — new features, significant refactors, API contracts — **must follow the Spec-Driven Development (SDD) workflow**:

1. **Propose** — generate a proposal + specs + design + tasks using `openspec-propose` before writing any code.
2. **Review** — the user reviews and approves the OpenSpec artifacts in `openspec/changes/`.
3. **Implement** — code is written strictly based on the approved spec, delegated to `@coder`.
4. **Validate** — `@tester` writes/updates tests and runs the gates (lint + build + unit tests, plus E2E when the change warrants it per the spec); `@reviewer` does the final quality audit.
5. **Close & Final Approval (mandatory checkpoint)** — verify Definition of Done, run `/opsx:archive` to move the change folder to `openspec/changes/archive/`, then **STOP and present the full summary to the user**: green gates (lint + build + unit tests + E2E when applicable), reviewer verdict, archived change folder, and a `git status`/diff overview of everything that will be committed. **No commit and no push until the user explicitly approves at this checkpoint.** This checkpoint is mandatory for every change — SDD or direct implementation — with no exceptions. Only after approval: commit (Commitizen format), and push only if separately authorized.

### Presentation docs for UI-bearing changes

`docs/design-system.md` is the single source of truth for how things are presented — theming, palettes, typography, spacing, visualization heuristics, accessibility. `docs/technical/libraries.md` catalogues the charting/mapping/table candidates, what was ruled out and why, and the technical traps; it is research, not decisions.

- `@coder` reads `docs/design-system.md` before implementing a UI-bearing change (new/changed pages, visual components, visualizations, layout or theme changes).
- `@reviewer` audits UI-bearing changes against it.

**These docs outrank an agent's general knowledge.** Where they state a fact about this codebase, that fact wins over the usual answer for a React/Tailwind project. Where they mark something pending, it stays pending — an agent does not settle it in passing, and does not treat the library candidates as a choice it may make on the project's behalf. When a change establishes a new presentation decision, it updates `docs/design-system.md` in the same change.

### OpenSpec spec files: delta vs canonical

OpenSpec uses two kinds of spec file with **different grammars**. Mixing them corrupts the canonical specs.

|           | Delta spec                                                                     | Canonical spec                                                  |
| --------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Path      | `openspec/changes/<change>/specs/<capability>/spec.md`                         | `openspec/specs/<capability>/spec.md`                           |
| Describes | an **operation** to apply                                                      | the **current state**                                           |
| Headings  | `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements` | `# <capability> Specification`, `## Purpose`, `## Requirements` |
| Lifetime  | temporary — archived with the change                                           | permanent — accumulative                                        |

**Rule when archiving a change:** _merge_ the delta into the canonical spec — never copy the delta file over it. Apply each operation (add / modify / remove the named requirements), then leave the canonical file in its own grammar. A canonical spec MUST NOT contain `## ADDED Requirements` or any other delta heading: it does not "add" anything, it states what is. Requirements the change did not touch MUST be left untouched.

Every canonical spec MUST keep this shape:

```markdown
# <capability> Specification

## Purpose

<one line describing what this capability is for>
## Requirements
### Requirement: ...
#### Scenario: ...
```

Spec content is **English only**, like every other generated artifact.

> The OpenSpec CLI (`@fission-ai/openspec`, pinned root devDependency) is installed. Archive changes with `npx openspec archive <change> --yes` — it validates the change, merges the delta specs into the canonical specs (merge semantics enforced by the tool), and moves the folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`. The delta↔canonical grammar rules are enforced automatically. The pre-push gate runs `npx openspec validate` twice (`--specs` and `--archived`, as separate fail-fast commands — the CLI cannot combine the scopes).

> **Note:** Improvement ideas and planned features are tracked in [`ROADMAP.md`](./ROADMAP.md). When ready to implement, a formal OpenSpec proposal is created from the roadmap item.

### What requires a spec (non-trivial)

Always propose before implementing:

- New pages, routes, or HTTP status behavior
- New or modified API endpoints (NestJS)
- New or modified shared types in `@eco-metrics/shared`
- Data fetching integration (SWR, fetch, external APIs)
- New reusable components with state or side effects
- New NestJS modules
- Cross-cutting changes (multiple apps/packages)
- Major version upgrades of core toolchain/frameworks (NX, Next.js, NestJS, React, TypeScript) — they change behavior, ship breaking changes/migrations, and have repo-wide blast radius
- Loading states, error boundaries, accessibility overhauls
- Auth, security, or environment variable changes
- Significant refactors that change architecture (not just rename/move)

### What skips the spec (trivial)

Implement directly without a spec:

- Copy/text changes in any page
- Swapping or resizing icons (pure visual, no logic)
- Tailwind class adjustments (spacing, color, size)
- Snapshot updates following a trivial visual change
- Lint fixes, import reordering, formatting
- Adding `data-testid` attributes
- Patch/minor dependency updates (majors of core toolchain/frameworks do require a spec — see the non-trivial list above)
- Single-line config tweaks

### When in doubt

The AI orchestrator **must ask the user** before deciding: _"This could be trivial or non-trivial — do you want a spec for this?"_  
Never silently skip a spec for something borderline. The rule: **if it introduces new behavior or changes existing behavior, it needs a spec.**

> **Key test:** Does the change introduce new behavior, modify existing behavior, establish a new architectural pattern — or carry significant technical risk / repo-wide blast radius (e.g., a major toolchain or framework upgrade)? Yes → spec. Is it mechanical, low-risk, and requiring little planning (typo, copy text, styling, formatting, rename)? → trivial, direct implementation.

---

## Build/Lint/Test Commands

```bash
# Development (starts both apps in parallel)
npm run dev
# or: npx nx run-many --targets=dev,serve --all --parallel

# Build all apps
npm run build
# or: npx nx run-many --target=build --all

# Run all tests
npm run test
# or: npx nx run-many --target=test --all


# Single app commands
npx nx dev web          # http://localhost:3000 (web target is 'dev' — 'nx serve web' does not exist)
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

### TypeScript

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

### Testing Conventions

- Jest tests always use `it('...')`. Playwright E2E tests in `e2e/` always use `test('...')`.
- Group related tests with `describe('...')` blocks.
- Test files use `*.test.ts` or `*.test.tsx` inside `__tests__/`, mirroring `src/` structure (e.g., `src/foo.ts` → `__tests__/foo.test.ts`).
- Test descriptions must be written in English and describe the expected behavior (e.g., `it('should return 404 when resource is not found')`).
- **Tests must produce zero errors and zero warnings.** A passing test that emits `console.error` or `console.warn` is not acceptable — the warning is a symptom of a real problem and must be fixed at the root.
- If a test warning or error appears, investigate the cause and apply the cleanest, most idiomatic fix (e.g., use the right render strategy, fix the component structure, use proper async handling). Do **not** suppress or silence output as a workaround.
- If the correct fix is unclear or multiple approaches exist, **ask before implementing** — prefer the most standard/best-practice solution.

#### Coverage thresholds

- Coverage is measured via `collectCoverage: true` in each project's `jest.config.cts`. Do **not** disable or lower thresholds without discussion.
- **Global thresholds:** 80% statements / functions / lines for all three projects (`shared`, `api`, `web`).
- **Branches — `shared`:** 80% (achievable with the current pure-function codebase).
- **Branches — `web`:** 75% (icon components have an untested `title` prop branch that renders `aria-labelledby` vs `aria-hidden`; actual coverage sits at ~79%).
- **Branches — `api`:** threshold intentionally **omitted** — NestJS decorators (`@Controller`, `@Injectable`, etc.) compiled with SWC produce phantom branches in the coverage report that cannot be exercised by unit tests.

#### Snapshot tests — when and how to update

Snapshots live in `__tests__/__snapshots__/`. They capture rendered output and fail when the output changes unexpectedly.

**When to update:** only when a UI change is intentional — e.g., you modified a component's markup, classes, or structure on purpose.

**How to update:**

```bash
npm run update-snapshots          # updates all snapshots across all projects
npx nx test web -- --updateSnapshot   # updates only web snapshots
npx nx test api -- --updateSnapshot   # updates only api snapshots
```

**Before committing updated snapshots:** visually diff the `.snap` files to confirm only the intended components changed. An unexpected snapshot diff is a sign of an unintended side effect — investigate before committing.

#### Known jsdom / Next.js testing gotchas

- **`next/link` strips trailing slashes in jsdom** — when `trailingSlash: true` is set in `next.config.ts`, the Next.js router adds trailing slashes at the browser/server level. However, `<Link href="/foo/">` renders `<a href="/foo">` in the jsdom test environment. Assertions on rendered `href` attributes must use the non-trailing-slash form (e.g., `toBe('/air-quality')`). The `isActive` logic in components should still receive and compare trailing-slash hrefs (matching real `usePathname()` output).
- **`aria-hidden="true"` on `<img>` maps to role `presentation`** — `next/image` with `aria-hidden` removes the element from the accessibility tree; `getByRole('img', { hidden: true })` will not find it. Use a `data-testid` on the wrapper element instead.

### Git/Commit Conventions

- Uses [Conventional Commits](https://www.conventionalcommits.org/) enforced via Commitizen
- Format: `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Examples: `feat(metrics): add new chart widget`, `fix(api): resolve data fetch error`

#### Branch strategy

```
feature/* ──► develop ⇄ main (production)
#                      ▲        back-merge auto: syncs versions + changelogs (release.yml)
```

- **`main`** — protected. No direct pushes. All changes enter via PR from `develop`. Requires CI pass + 1 PR review before merge. No force pushes allowed.
- **`develop`** — integration branch. Work happens here or in short-lived `feature/*` branches off `develop`. Force push allowed for history cleanup before opening a PR.
- **`feature/*`** — optional, for large or parallel work. Branch off `develop`, PR back into `develop`.

> **Admin override:** as repo owner you can merge a PR on `main` without a reviewer approval via GitHub's "Merge without waiting for requirements" button. Use it when working solo — the protection is a guardrail, not a blocker.

#### Rules — for humans and AI agents alike

1. **Never commit without explicit request** — do not create a commit unless the user explicitly asks for it.
2. **Never push to `main` directly** — all changes must go through a PR from `develop`. Branch protection enforces this.
3. **Never push without confirmation** — always ask the user before running `git push`, regardless of the branch.
4. **Always run tests before pushing** — run `npm run test` before any push. If all tests pass and the push has been authorized, proceed. If any test fails, show a summary of the failing suites and do not push until they are fixed.
5. **Always use Commitizen format** — every commit message must follow `type(scope): description`. Free-form messages are not allowed.
6. **One logical change per commit** — keep commits atomic and focused.

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
├── .nvmrc                       # Node.js v24
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

```

Pre-PR checklist: `npm run lint`, `npm run build`, `npm run test`, and `npm run e2e` must all pass with zero errors.

---

## Dependency Management

- **Always pin exact versions** — never use `^` or `~` in `package.json`. Use `npm install --save-exact` or manually set the exact version.
- **Use the latest compatible version** when adding or updating a package — check for peer dependency constraints before upgrading across major versions.
- **`@types/node` must match the runtime** — the project uses Node 24 LTS, so always use `@types/node@24.x`.
- **Install dependencies in the correct scope** — never install a dependency at the monorepo root unless it is shared across multiple apps/packages. Check which project actually needs the dependency:
  - `apps/api/`-only deps (e.g., `@nestjs/*`, `helmet`) → install in `apps/api/package.json`
  - `apps/web/`-only deps (e.g., `next`, `react`) → install in `apps/web/package.json`
  - `packages/shared/`-only deps → install in `packages/shared/package.json`
  - Shared dev tooling (e.g., `eslint`, `prettier`, `nx`, `typescript`) → root `package.json`
  - When in doubt, ask before installing.
- **`legacy-peer-deps=true` in `.npmrc` is required** because `eslint-plugin-jsx-a11y@6.10.2` does not declare ESLint 10 in its peer dependencies. Remove it only when a jsx-a11y release adds ESLint 10 support (tracked as I05 in ROADMAP.md).
- To update a package: check `npm outdated`, verify compatibility, install with `--save-exact`, then run `npm run build` and `npm run test` before committing.

## Documentation Maintenance

- **Keep README.md tech stack versions up to date** — when upgrading major dependencies (NX, Next.js, NestJS, React, TypeScript, etc.), update the version table in `README.md` immediately.
- **Update AGENTS.md when conventions change** — if a new architectural pattern, testing rule, or workflow is established, document it here.
- **Sync changes across related docs** — if you modify environment variables, update both the example files (`.env.example`) and the Environment Variables section in `README.md`.
- **Keep ROADMAP.md sequence continuous** — when a roadmap item is completed (or removed), delete its block and renumber all subsequent `Pxx`/`Dxx`/`Ixx` IDs so the sequence has no gaps, updating every cross-reference in the document (status table, Plan de Acción, other items' references). Historical archives under `openspec/changes/archive/` keep their old IDs intentionally — do not rewrite history.

---

## Engineering Principles

- **Always apply best practices.** Prefer idiomatic, well-established patterns over clever or novel solutions.
- **If it feels hacky, it probably is.** Before implementing a workaround, shortcut, or non-standard approach, stop and ask. There is almost always a cleaner solution.
- **Correctness over convenience.** Never silence, suppress, or work around an error/warning without understanding and fixing the root cause.
- **Ask when uncertain.** If two valid approaches exist and the tradeoffs are non-trivial, present the options and ask before proceeding.

## SEO Guidelines

- **Always apply SEO best practices** — use semantic HTML, descriptive `<title>` tags, `<meta name="description">`, Open Graph tags, and structured data where appropriate.
- **All navigable URLs must end with a trailing slash** — e.g., `/air-quality/` not `/air-quality`. This enforces a canonical URL format and avoids duplicate-content issues.
- **Respect URL hierarchy** — URL paths must reflect the content structure (e.g., `/category/subcategory/`). Never flatten hierarchies or create inconsistent nesting.
- **Canonical URLs** — always declare a canonical `<link>` when content is accessible via multiple paths.
- **No mixed slash patterns** — internal links, redirects, and sitemap entries must all use the same trailing-slash convention (with slash).

---

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `npm exec nx build`, `npm exec nx test`) - avoids using globally installed CLI
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

---

## AI Agent Model Configuration

Agent models are centralized in `opencode.json` under the `agent` key. The `.md` files in `.opencode/agents/` define agent behavior (prompts, tools, permissions) but **not** models.

### Overriding models per developer

Each developer can use their own models without modifying tracked files.

**Option A — Environment variable (recommended)**

Use `OPENCODE_CONFIG_CONTENT` to override models already defined in the project config.
This has the highest priority and beats all other config sources:

```bash
OPENCODE_CONFIG_CONTENT='{"agent":{"orchestrator":{"model":"opencode-go/kimi-k2.6"}}}' opencode
```

Wrap it in a shell alias for convenience:

```bash
alias opencode='OPENCODE_CONFIG_CONTENT='\''{"agent":{"orchestrator":{"model":"opencode-go/kimi-k2.6"}}}'\'' opencode'
```

**Option B — Global config (for new defaults only)**

Create `~/.config/opencode/opencode.json` with your preferred models:

```json
{
  "agent": {
    "orchestrator": { "model": "anthropic/claude-sonnet-4-20250514" },
    "coder": { "model": "openrouter/deepseek/deepseek-chat-v3" }
  }
}
```

This is deep-merged with the project config, but **the project config wins for conflicting keys**.
Useful only for keys the project does not define — does NOT override existing agent models.

> **Rule:** Never change `opencode.json` model values just because you prefer a different model. Use `OPENCODE_CONFIG_CONTENT` instead. Changes to `opencode.json` models should only happen when the team agrees on a new default.

---

## AI Orchestrator — Known Constraints

> These notes are for the AI agent running this project, not for human developers.

### Commit & push rules (STRICT)

The user must **explicitly authorize** every `git commit` and every `git push`. These are non-negotiable hard stops:

1. **Never commit without an explicit user request** — completing all tasks and passing all tests is NOT sufficient; always pause and wait.
2. **Never push without an explicit user request** — not even after a commit. Each is a separate authorization.
3. **Run `git pull` (default merge) before every push** — the remote may have new release tags between local pushes.
   Prefer merge over rebase to avoid rewriting commit SHAs, which breaks Vercel deployments and can drop merge-commit content.
4. When the user says "commitea y pushea" or similar, treat that as authorization for both in sequence — but do not auto-push on future tasks.

### Push workflow — husky pre-push hook & local E2E

- `.husky/pre-push` blocks direct pushes to `main` and runs `npx nx affected --target=test --base=origin/develop` (fast, NX-cached). E2E is not push-time: CI runs the full suite on every push; locally use `npm run e2e` (deterministic — the webServer wrapper brings up both servers and cleans up their process trees).
- SSH keep-alive hygiene: set `ServerAliveInterval` for the `github-mafmaggot` host in `~/.ssh/config` so long pushes don't die with `Connection closed by remote host`.
- If you start dev servers manually: `next dev` spawns a `next-server` worker that survives its parent and holds `:3000` — kill it by PID (`ss -tlnp | grep :3000`), never `pkill -f` with a self-matching pattern.

### "This model does not support assistant message prefill"

This error is thrown when the model's response is cut off mid-generation and the runtime tries to resume with a prefill. It happens consistently when a single tool call produces too much inline content.

**Hard rules — never break these:**

- **Never use `cat << 'EOF' ... EOF` (bash heredoc) to write files.** Use the `Write` tool for creating or overwriting files entirely.
- **Never use `bash` to write more than ~10 lines of file content inline.** Even short heredocs are risky if the total assistant turn is large.
- **Use the `Edit` tool for modifications** to existing files — targeted replacements, not full rewrites via heredoc.
- **Use `python3` scripts (via `bash`) for bulk or repetitive transforms** across multiple files — never inline each file as a heredoc.
- **Cap each assistant turn at ~3–4 tool calls when writing files.** If more writes are needed, split across multiple turns with a status update in between.
- **Always end every assistant turn with a plain-text sentence** after the last tool call block — never end mid-code-block or with only a tool call result.

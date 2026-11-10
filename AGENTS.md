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
- Colors come only from the tokens listed in `docs/design-system.md` (Color Tokens, and chart tokens under Color Palettes) — never Tailwind palette or arbitrary color utilities in `apps/web/src/app` or `apps/web/src/components`. `apps/web/__tests__/designTokens.test.ts` enforces it (the only exception, the ThemeToggle lamp, is listed under "Documented exceptions" there).

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
- Run: `npm run format` (check only: `npm run format:check`)

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
- **Smoke tagging.** Tag an E2E test `@smoke` (`test('...', { tag: '@smoke' }, ...)`) only when its result can differ by browser engine or viewport: render, layout, keyboard and pointer interaction. Tagged tests run in all five projects; untagged ones run only in `chromium-desktop`. Headers, SEO/HTML, metadata, provider-state and API checks are never tagged. Apply the rule by moving tags; never delete tests to apply it.
- Test files use `*.test.ts` or `*.test.tsx` inside `__tests__/`, mirroring `src/` structure (e.g., `src/foo.ts` → `__tests__/foo.test.ts`).
- Test descriptions must be written in English and describe the expected behavior (e.g., `it('should return 404 when resource is not found')`).
- **A test that reads files outside its project** (e.g. `scripts/`, `.github/workflows/`) must list them in that project's `test` target `inputs` (`nx.targets.test.inputs` in its `package.json`, which replaces the `targetDefaults.test.inputs` of `nx.json`, so keep those entries too). Otherwise Nx serves a stale cached pass when only those files change, and `nx affected` (the `pre-push` hook) skips the test.
- **Tests must produce zero errors and zero warnings.** A passing test that emits `console.error` or `console.warn` is not acceptable — the warning is a symptom of a real problem and must be fixed at the root.
- If a test warning or error appears, investigate the cause and apply the cleanest, most idiomatic fix (e.g., use the right render strategy, fix the component structure, use proper async handling). Do **not** suppress or silence output as a workaround.
- If the correct fix is unclear or multiple approaches exist, **ask before implementing** — prefer the most standard/best-practice solution.

#### Coverage thresholds

- Coverage is measured via `collectCoverage: true` in each project's `jest.config.cjs`. Do **not** disable or lower thresholds without discussion.
- **Global thresholds:** 80% statements / functions / lines for all three projects (`shared`, `api`, `web`).
- **Branches — `shared`:** 80% (achievable with the current pure-function codebase).
- **Branches — `web`:** 80% (the icon `title` prop branches — `aria-labelledby` vs `aria-hidden` — are covered by the barrel icon tests in `__tests__/components/icons/`).
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

- Uses [Conventional Commits](https://www.conventionalcommits.org/), enforced by **commitlint** in the husky `commit-msg` hook (`commitlint.config.js`, extends `@commitlint/config-conventional`). A rejected message aborts the commit after `pre-commit` (lint-staged + typecheck) has already run.
- Format: `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Examples: `feat(metrics): add new chart widget`, `fix(api): resolve data fetch error`
- Use scope `tooling` for CI, Nx, scripts and hooks (not `ci`): `.releaserc.mjs` skips it, so it does not cut web/api releases.
- Rules commitlint enforces:
  - **Header** (`type(scope): description`) ≤ 100 characters; scope expected (a missing one warns); description starts lowercase and has no trailing period.
  - **Body** optional, separated from the header by one blank line; **every line ≤ 100 characters** — wrap prose at ~72. The same limit applies to footers.
- Write multi-line messages with one `-m` per paragraph and hard line breaks inside each, or with `git commit -F <file>`. Never put a whole paragraph on a single line.
- To check a message before committing: `printf '%s\n' "<message>" | npx commitlint`.

#### Branch strategy

```
feature/* ──► develop ⇄ main (production)
#                      ▲        back-merge auto: syncs versions + changelogs (release.yml)
```

- **`main`** — production. All changes enter via PR from `develop`; never push to it directly and never force-push it. The repository is public, and a GitHub branch ruleset on `main` blocks deletion and force pushes. It does **not** require a pull request or status checks, on purpose: `release.yml` pushes release commits and the lockfile sync straight to `main` with `GITHUB_TOKEN`, and those rules would reject them. "PRs only" is therefore enforced by convention plus the husky `pre-push` hook, which blocks direct pushes to `main` from a local machine. Production safety comes from the CI gates: the API deploys `need` the CI job and the `api-image` build check (production from `main`, dev from `develop`), and Vercel Deployment Checks hold the web production deployment until CI passes (see [`docs/deploy/vercel.md`](./docs/deploy/vercel.md)).
- **`develop`** — integration branch. Work happens here or in short-lived `feature/*` branches off `develop`. A branch ruleset blocks its deletion and force pushes, so history is never rewritten: fix mistakes with new commits (e.g. `git revert`).
- **`feature/*`** — optional, for large or parallel work. Branch off `develop`, PR back into `develop`.

#### CI/CD gates

- The CI job name `Format, Lint, Typecheck, Build & Test` is a contract with Vercel Deployment Checks: renaming it requires updating the Vercel setting in the same change.
- The CI job runs in the official Playwright container (`container.image: mcr.microsoft.com/playwright:v<version>-noble` in `ci.yml`). The tag is a literal (workflow `env` is unavailable in `container.image`) and must equal the installed `@playwright/test` version; Dependabot does not update it. The `Verify Playwright image matches @playwright/test` step runs `node scripts/check-playwright-image.mjs` (also runnable locally after `npm ci`) and fails with the tag to use. When `@playwright/test` changes, bump the image tag in `ci.yml` in the same change.
- The `api-image` job in `ci.yml` (`Build API image (no push)`) builds the `Dockerfile` without publishing it, only when an image input changed, and gates at step level, never with a job-level `if` (a skipped job would also skip the `deploy-api-*` jobs, which `need` it). The image-input paths live only in `scripts/api-image-inputs.pattern`, read by `deploy-api.yml` and `scripts/detect-api-image-changes.sh`; edit them there, never inline. It is not part of the Vercel check.
- The `E2E` step of the `ci` job is skipped only when both hold: every path changed between the base and head revisions matches `scripts/docs-only-paths.pattern` (edit the pattern there, never inline), and every latest check run named `CI_CHECK_NAME` (the job name, set in `ci.yml`) on the base SHA concluded `success`. `scripts/detect-e2e-skip.cjs` decides in the `e2e_gate` step and the gate is step-level only, never a job-level `if` or `paths-ignore`, so the job always runs and reports. The pattern is read from the base revision (`git show BASE:scripts/docs-only-paths.pattern`), so a pattern change takes effect from the next push; the pattern file, the detector and `ci.yml` always count as non-docs; the diff uses `--no-renames`, so a rename counts on both sides. It reads the base check (GitHub Actions app only) with the job's `checks: read` permission; any doubt (no base, API error, missing token, empty diff, git unable to read the repository) runs E2E. The step right after checkout adds `$GITHUB_WORKSPACE` to git's global `safe.directory`: the job runs as root over a runner-owned workspace, and without it every later git call fails with "dubious ownership", so E2E always runs.
- The API deploys only through the CI-gated jobs in `ci.yml` that call `deploy-api.yml` — `deploy-api-production` (`main` → Cloud Run `eco-metrics-api`) and `deploy-api-development` (`develop` → `eco-metrics-api-dev`, consumed by Vercel previews) — or a deliberate `workflow_dispatch` with a `target` (`production` only from `main`). Never add a deploy trigger that bypasses CI.
- The deploy concurrency group is `deploy-api-${{ inputs.target }}` — a literal prefix per target, never `${{ github.workflow }}` (which resolves to the caller's name in a reusable workflow).
- The target → service/CORS-variable mapping lives only in the `Resolve deploy target and pre-flight checks` step of `deploy-api.yml`. Dev variables use a `_DEV` suffix (`CORS_ORIGIN_DEV`, `CORS_ORIGIN_PATTERN_DEV`): GitHub Environments are unavailable on this plan.

#### Rules — for humans and AI agents alike

1. **Never commit without explicit request** — do not create a commit unless the user explicitly asks for it.
2. **Never push to `main` directly** — all changes must go through a PR from `develop`. The `main` ruleset does not require a pull request (release automation pushes there), so the husky `pre-push` hook blocks it locally.
3. **Never push without confirmation** — always ask the user before running `git push`, regardless of the branch.
4. **Always run tests before pushing** — run `npm run test` before any push. If all tests pass and the push has been authorized, proceed. If any test fails, show a summary of the failing suites and do not push until they are fixed.
5. **Always use Conventional Commits format** — every commit message must follow `type(scope): description` and pass commitlint (see Git/Commit Conventions). Free-form messages are not allowed.
6. **One logical change per commit** — keep commits atomic and focused.

---

## Project Structure

```
eco-metrics-earth/
├── apps/
│   ├── api/                     # NestJS BFF
│   │   └── src/
│   │       ├── app/             # AppModule, global pipeline helper
│   │       ├── health/          # Liveness (GET /api/v1/health) + dependencies check (GET /api/v1/health/dependencies, one Terminus indicator per provider)
│   │       ├── modules/         # Per-category eco modules (`water-footprint`, `co2-emissions`, `global-temperature`, `energy-sources`) + `providers/owid` client and `OwidProviderStatus` + `data-sources` catalog
│   │       ├── common/          # Outbound HTTP client, `errors/` (`ProviderError` -> 502), `series/` (`buildYearAlignedEntities`, `roundTo`), `snapshots/` (`ProviderSnapshotService.resolve`, `SnapshotStore` port with GCS and disabled stores; `SNAPSHOT_BUCKET` / `SNAPSHOT_PREFIX`), catch-all 404 fallback, global exception filter, `internal-key/` (`InternalKeyGuard`, `@AllowKeyless()`, `isKeyedRequest` + `buildThrottlerOptions` for the two throttler tiers), publisher resolver
│   │       ├── config/          # AppConfigService (typed env vars)
│   │       └── main.ts          # Bootstrap — port 3001, prefix /api/v1
│   └── web/                     # Next.js App Router
│       ├── public/geo/          # world-countries.json (pre-projected world geometry) and world-silhouette.svg (map skeleton mask), generated, never hand-edited
│       └── src/
│           ├── app/             # Routes, layouts, pages (App Router)
│           ├── components/      # Reusable UI components (`charts/`: ECharts wrapper, theme adapter, lazy loading, `ChartPanel`, world choropleth `ChoroplethMap` + `MapLegend` on the lazy `LazyMapEChart` entry,  `YearSlider`; `co2-emissions/`; `global-temperature/`; `energy-sources/`; generic `CountryExplorer`, `MeasureToggle`, `YearDataTable`, `DataAttribution`; `CountryCombobox`, `CountryFlag`; `ProviderBackedContent`, `StaleDataNotice`, `DataUnavailable` for provider outages; `NavigationContent`, `PendingNavigation`, `NavigationLink`, `CategoryHeader`, `CategoryDataSkeleton` for client navigation)
│           └── lib/             # Utilities and helpers (`bffFetch.ts`: server-side BFF reads with retry and shape validation; `categoryPages.tsx`: per-category page registry with `defineProviderCategoryPage`; `categorySkeletons.ts`: skeleton blocks per category; `categoryFromHref.ts`: category of a link; `providerFreshness.ts`: stale/unavailable thresholds; `worldGeometry.ts`: fetch and register the world map once; `co2MapOption.ts` / `co2Ranking.ts`: CO2 map option and ranking; `cardClassNames.ts`: data column, card, key-figures, bleed and table-region classes shared by the category content and its skeleton)
├── packages/
│   └── shared/                  # @eco-metrics/shared
│       └── src/lib/
│           ├── api-response.ts             # ApiResponse<T> union + ApiResponseMeta
│           ├── co2-emissions.ts            # CO2 emissions wire types (year-aligned arrays)
│           ├── country-codes.ts            # ISO alpha-3 -> alpha-2 crosswalk, World/Kosovo codes, entity allowlist
│           ├── country-series.ts           # CountryEntity + DatasetIdentity shared by year-aligned payloads
│           ├── data-source-attribution.ts  # DataSourceAttribution (provider, license, source)
│           ├── data-sources.ts             # Data sources catalog types (live providers, static datasets, publications)
│           ├── eco-category.ts             # EcoCategory type + ECO_CATEGORIES const
│           ├── energy-sources.ts           # Energy sources wire types (ENERGY_SOURCE_IDS, generation by source, shares derived by the web)
│           ├── global-temperature.ts       # Global temperature wire types (anomaly, baseline, upstream origin)
│           ├── metric-series.ts            # MetricPoint + MetricSeries time-series shapes
│           └── water-footprint.ts          # Water-footprint product, category and water-type types
├── scripts/                     # Repo scripts: CI helpers, `generate-world-geometry.mjs` (`npm run geo:world`, regenerates apps/web/public/geo/)
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
5. If the module uses external data, decorate a provider with `@DataSourceContributor()` and implement `getDataSources()` to declare its sources — never in the web app or the shared package. Static datasets need no hand-kept dates: citations carry their publication year in parentheses, validated at construction.

### Adding an OWID-backed category (end to end)

`co2-emissions` was the reference implementation, `global-temperature` the first to follow it and `energy-sources` the first composition (stacked area + donut, semantic palette); start from the generic pieces they share instead of copying either one: `buildYearAlignedEntities` / `roundTo` / `latestTimestamp` (`apps/api/src/common/series/`), `buildOwidEnvelope` (`providers/owid/`), `CountryExplorer` + `ChartPanel` + `YearDataTable` + `DataAttribution` + `OriginCredit` + `RenderWhenVisible` (`apps/web/src/components/`), `buildDatasetJsonLd` (`lib/datasetJsonLd.ts`), `isYearAlignedCountryData` (`lib/payloadGuards.ts`) and `fetchProviderPayloadFromBff` (`lib/bffFetch.ts`). A provider-backed category adds these pieces and nothing else:

1. **Shared wire types** in `packages/shared/src/lib/<category>.ts`, exported from the root. Keep the payload compact (year-aligned arrays rather than per-point objects) when it carries many entities.
2. **API module** `apps/api/src/modules/<category>/`: a service on `OwidClient` (explicit `column`, explicit `country` allowlist, a pure exported builder function for the assembly), `registerCategory(category, origins)` on `OwidProviderStatus` in its constructor (the static `DataSourceOrigin` constants of the upstream producers: the same constants feed the catalog and the payload's `data.origin`) and `recordProviderUpdate(...)` after each success — never build the OWID data-source entry in the category module (a second `owid` entry crashes the boot) — a controller documented with `@ApiOkResponse` and `@ApiBadGatewayResponse`, the module importing `OwidModule` and `SnapshotsModule`, and the import in `AppModule`. The service's public method returns `ProviderSnapshotService.resolve(<category slug>, () => this.assemble())` (the assembly stays a private method; `recordProviderUpdate` is called inside it, so only for fresh results) and the controller passes the result's `fetchedAt` and `stale` to `buildOwidEnvelope`. That is the whole resilience story: when OWID fails and a stored snapshot exists, the endpoint answers `200` with `meta.stale: true` and the snapshot's `meta.fetchedAt`; without one it is the `502` below.
3. **Failures are provider errors.** Provider failures extend `ProviderError` (`common/errors/`); the global filter maps any of them to `502` with a constant body, so there is no per-controller mapping. Throw `ProviderDataError` when the provider answers with unusable content. Unexpected errors stay `500`.
4. **API tests** with fixtures captured once from the exact URLs the service uses (never inside a test), the transport stubbed through `OUTBOUND_FETCH`, and no network.
5. **Web side**: `src/lib/<category>.ts` (`server-only`, on `fetchProviderPayloadFromBff` with a shape guard built on `isYearAlignedCountryData`), a content component under `src/components/<category>/` (server-rendered key figures, a client explorer, `SourceAttribution` fed from `meta.source`), a chart option builder on `LazyEChart` (pure, no colors), the skeleton blocks in `CATEGORY_SKELETONS` (`src/lib/categorySkeletons.ts`, client-safe; a test keeps it in sync with the registry), the entry in `CATEGORY_PAGES` through `defineProviderCategoryPage` (`src/lib/categoryPages.tsx`: `provider.name`, optional `provider.freshness` override; this gives the stale notice after 7 days and the unavailable state after 30 days or a provider `502` with no further code; registering a category also removes it from `generateStaticParams`) and the live meta description in `src/lib/categoryMetadata.ts`.
6. **E2E** in `apps/web/e2e/<category>.spec.ts` against the OWID fixture server (below), plus the axe and SEO specs. Tag as `@smoke` only the render, overflow and main-control checks (see Smoke tagging in Testing Conventions).
7. **Docs**: `docs/design-system.md` when a presentation decision is made, this file's structure tree, and the READMEs.

**Check the chart before building on it.** Open the chart's default tab (a chart that opens on its map tab ignores `country` unless the request passes `tab: 'chart'`, which silently yields one year per entity), the unit and baseline (verify any baseline against the provider's description, not an assumption), and the upstream licence: the producer of the measurements is declared as an origin (`registerCategory(category, origins)`), served in the payload and credited next to the chart with `OriginCredit` through the `extra` slot of `DataAttribution`, with the notice, citation and disclaimer its license asks for.

**Health: liveness vs dependencies.** `GET /api/v1/health` is liveness only (the Cloud Run startup probe): it never calls a provider and `HealthController` takes no provider dependency. `GET /api/v1/health/dependencies` runs Terminus indicators against the providers (one indicator per provider, not per category) and answers with Terminus' native body, `200` or `503`.

**Provider snapshots.** `SNAPSHOT_BUCKET` (optional GCS bucket; unset or empty disables persistence, the default for local development and tests) and `SNAPSHOT_PREFIX` (kebab-case, required when the bucket is set; the deploy workflow sets it to `production` or `development`) configure `SnapshotsModule`. The write policy keeps the bucket inside the GCS Always Free tier: a write happens only when the content hash changed or the stored object is 24 h old; `stat` (metadata only) runs at most once per key per process whatever its outcome; a failed write backs the key off for 1 h; the whole persistence step is bounded by one 5 s timeout; and a provider outage with nothing stored costs one read per hour per key; storage failures never change a response or `GET /api/v1/health`. No test may reach GCP: tests use a stub `SnapshotStore` (`apps/api/__tests__/common/snapshots/stub-snapshot-store.ts`). The bucket is created once from `docs/deploy/cloud-run.md` (section 22).

**E2E never reaches live providers.** The webServer wrapper (`apps/web/e2e/run-dev-servers.ts`) starts a local OWID fixture server (`e2e/utils/owid-fixture-server.ts`, committed trimmed fixtures in `e2e/fixtures/owid/`, port in `e2e/utils/api-env.ts`) and starts the API with `OWID_GRAPHER_BASE_URL` / `OWID_API_BASE_URL` pointing at it. A new OWID-backed category adds its chart CSVs and indicator metadata there. Verify against the real provider manually.

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
npm run format:check

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
- **`legacy-peer-deps=true` in `.npmrc` is required** because `eslint-plugin-jsx-a11y@6.10.2` does not declare ESLint 10 in its peer dependencies. Remove it only when a jsx-a11y release adds ESLint 10 support (tracked as I04 in ROADMAP.md).
- **Dependabot alerts are enabled** (repository Security tab) for known vulnerabilities in the manifests. Automated security-fix PRs are **disabled** on purpose: GitHub always opens them against `main`, which only receives PRs from `develop`. Apply alert fixes manually on `develop`. Routine version updates (base image digest, GitHub Actions) come as weekly `chore(deps)` PRs against `develop` (`.github/dependabot.yml`).
- To update a package: check `npm outdated`, verify compatibility, install with `--save-exact`, then run `npm run build` and `npm run test` before committing.

## Documentation Maintenance

- **Keep README.md tech stack versions up to date** — when upgrading major dependencies (NX, Next.js, NestJS, React, TypeScript, etc.), update the version table in `README.md` immediately.
- **Update AGENTS.md when conventions change** — if a new architectural pattern, testing rule, or workflow is established, document it here.
- **Sync changes across related docs** — if you modify environment variables, update both the example files (`.env.example`) and the Environment Variables section in `README.md`.
- **Keep ROADMAP.md sequence continuous** — when a roadmap item is completed (or removed), delete its block and renumber all subsequent `Pxx`/`Dxx`/`Ixx` IDs so the sequence has no gaps, updating every cross-reference in the document (status table, Plan de Acción, other items' references). Historical archives under `openspec/changes/archive/` keep their old IDs intentionally — do not rewrite history.
- **OpenSpec artifacts never reference ROADMAP item IDs** — proposals, designs, tasks and specs describe roadmap items by content, not by `Pxx`/`Dxx`/`Ixx` ID, because IDs are renumbered whenever an item closes. Archived changes stay untouched.

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
- SSH keep-alive hygiene: set `ServerAliveInterval` for your GitHub SSH host in `~/.ssh/config` so long pushes don't die with `Connection closed by remote host`.
- If you start dev servers manually: `next dev` spawns a `next-server` worker that survives its parent and holds `:3000` — kill it by PID (`ss -tlnp | grep :3000`), never `pkill -f` with a self-matching pattern.

### Category pages must not stream their data

`[category]/page.tsx` uses `ensureStatic = 'navigation'` and has no `loading.tsx` or `<Suspense>` around its data, on purpose: React outlines any boundary over 12.8 KB into `<div hidden>` after the footer, so crawlers would not get the content in the visible document. Pending feedback lives on the client (`PendingNavigationProvider`, `NavigationContent`). Links that lead to a category use `NavigationLink`, and `<main>` exists only in the root layout: pages render a `<div>` with `pt-header` (the mobile header plus the top safe area). The same absence of a boundary means a `notFound()` raised while rendering gets an empty `<body>`, so the rewrite in `next.config.ts`, built from `ECO_CATEGORIES`, sends unknown slugs to an unmatched path before they reach `[category]`. Percent-encoded unknown slugs and valid categories in another case skip it and still get a real 404 from the page, with the empty `<body>`.

### Next's fetch Data Cache outlives deployments and holds old BFF contracts

The web reads the BFF with `next: { revalidate: 86400 }`, under the `use cache` of `loadCategoryData`, which is in-memory on serverless and declares the lifetime with `cacheLife`. The Data Cache is what persists across deployments and dev restarts (`apps/web/.next/dev/cache/fetch-cache` locally), so after a BFF payload contract change cached responses can fail the new strict payload guard on both attempts and the page throws ("BFF payload does not match the expected response shape"). `fetchEnvelopeFromBff` heals this: a shape mismatch makes the retry use `cache: 'no-store'`. Still: deploy the API before the web for every payload change, and if a dev server misbehaves after a contract change, deleting `.next/dev/cache` is safe. A stale-snapshot payload (`meta.stale: true`) is a normal `200` and is cached like any other, so after the provider recovers the notice can linger for up to one more revalidation window; only a provider `502` is kept off the 24 h slot (`fetchProviderPayloadFromBff` retries it with `revalidate: 300`).

### "This model does not support assistant message prefill"

This error is thrown when the model's response is cut off mid-generation and the runtime tries to resume with a prefill. It happens consistently when a single tool call produces too much inline content.

**Hard rules — never break these:**

- **Never use `cat << 'EOF' ... EOF` (bash heredoc) to write files.** Use the `Write` tool for creating or overwriting files entirely.
- **Never use `bash` to write more than ~10 lines of file content inline.** Even short heredocs are risky if the total assistant turn is large.
- **Use the `Edit` tool for modifications** to existing files — targeted replacements, not full rewrites via heredoc.
- **Use `python3` scripts (via `bash`) for bulk or repetitive transforms** across multiple files — never inline each file as a heredoc.
- **Cap each assistant turn at ~3–4 tool calls when writing files.** If more writes are needed, split across multiple turns with a status update in between.
- **Always end every assistant turn with a plain-text sentence** after the last tool call block — never end mid-code-block or with only a tool call result.

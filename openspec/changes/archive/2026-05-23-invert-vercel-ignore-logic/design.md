## Context

Vercel deployments for the `eco-metrics-earth` monorepo are configured via `vercel.json` at the repository root. The current `ignoreCommand` uses an **allowlist** approach:

```bash
git diff --quiet \ \ -- apps/web/ packages/shared/
```

This skips deploys unless changed files touch `apps/web/` or `packages/shared/`. The monorepo has two deploy targets: Vercel (web) and Railway (api). Changes to `apps/api/` correctly do not trigger Vercel deploys, but the allowlist is fundamentally the wrong default.

The same repository contains root-level configuration files that directly affect the web build but are **not** covered by the allowlist:
- `package.json` — workspace dependencies, scripts, package versions
- `nx.json` — task runner configuration, caching, named inputs
- `tsconfig.base.json` — path aliases, compiler options inherited by web
- `vercel.json` — the build command and framework settings themselves
- `.npmrc`, `.nvmrc` — runtime resolution

A change to any of these files can silently break the next deploy without any indication until a future change in `apps/web/` triggers the broken build.

## Goals / Non-Goals

**Goals:**
- Invert the `ignoreCommand` from allowlist ("deploy only if X changed") to denylist ("skip deploy only if everything changed is in Y")
- Eliminate the latent-breakage risk from root config changes
- Keep the denylist minimal and conservative — only skip for demonstrably safe scopes

**Non-Goals:**
- Changing the build command, framework, or output directory
- Modifying the Railway deployment pipeline
- Adding CI-only skip logic (e.g., `[skip ci]` in commit messages)
- Changing how Vercel triggers builds (branch, events, etc.)

## Decisions

### Decision 1: Denylist over allowlist

**Chosen**: Invert to denylist.

**Alternatives considered**:
- *Expand the allowlist*: Add root config files to the diff. Rejected because it's an arms race — every new config file that affects the build must be remembered and added. The default remains unsafe.
- *Remove ignoreCommand entirely*: Deploy on every push regardless. Rejected because unnecessary deploys on api-only or docs-only changes waste compute and add noise to the deployment history.
- *Use Vercel's "Ignored Build Step" with environment variables*: Rejected because the monorepo-level filtering (api/ vs web/) requires git diff awareness that Vercel's built-in project-level ignore doesn't provide.

**Rationale**: Denylist is the safer default for production. A false positive (unnecessary deploy) costs seconds; a false negative (missed deploy) can leave production broken indefinitely.

### Decision 2: Denylist scope

**Included** (skip deploy when ALL changes are in these):
- `apps/api/` — deployed separately on Railway. Zero impact on Vercel build.
- `openspec/` — specification artifacts. No runtime or build effect.
- `*.md` files — documentation (README, ROADMAP, AGENTS, etc.). Markdown files are inert at build time regardless of location.

**Excluded** (always trigger deploy):
- `.github/` — CI/CD workflows. If a workflow change breaks the release pipeline, the deploy should fail visibly so the issue is caught immediately.
- Root config files (`package.json`, `nx.json`, `tsconfig.base.json`, `vercel.json`, etc.) — all can affect the web build.
- `packages/shared/` — shared types used by web.
- `apps/web/` — the web app itself.

**Alternatives considered**:
- *Include `.github/` in denylist*: Rejected per user requirement — CI breakage should be surfaced.
- *Include individual inert files instead of `*.md` glob*: Rejected because `*.md` is simpler and more comprehensive. No markdown file can affect a Next.js build.

### Decision 3: Shell command implementation

**Chosen**: Use `git diff --name-only` with a filter that exits 0 (skip) only when no files outside the denylist changed.

```bash
# Exit 0 (skip build) if ZERO files outside denylist changed
# Exit 1 (build) if ANY file outside denylist changed
changed_files=
# Check if there are any files NOT matching the denylist patterns
outside_denylist=""
[ -z "" ]
```

The guard clauses for unset or unresolvable SHAs are preserved from the original command:
```bash
if [ -z "" ]; then exit 1; fi
if ! git cat-file -e "" 2>/dev/null; then exit 1; fi
```

## Risks / Trade-offs

**[Risk] Unnecessary deploys increase** — changes to root configs or `.github/` now trigger builds even when the web output is identical.
→ **Mitigation**: Vercel caches builds aggressively (Next.js output is hashed). An unchanged web app produces a cache hit. Cost increase is negligible.

**[Risk] `*.md` glob may miss some markdown edge case** — if a markdown file somehow influences the build (e.g., read at build time by a webpack loader).
→ **Mitigation**: No such loader exists in this project. If one is added in the future, the denylist scope should be reviewed. The risk of a missed deploy is still worse than an unnecessary one.

**[Risk] Denylist is evaluated file-by-file, not per-commit** — a single commit mixing api/ changes with a root config change triggers a deploy.
→ **Mitigation**: This is intentional and correct. The root config change must be deployed.

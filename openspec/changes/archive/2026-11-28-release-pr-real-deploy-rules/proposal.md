## Why

### Goals

- Make the "Deploys" section of the release PR description match what really deploys. On the last release PR it said "API only" although the PR also changed `scripts/*.mjs` and a workflow, which Vercel builds for. In the other direction, root `package.json`, `package-lock.json`, `nx.json` and similar files deploy the API but were missed by the prefix rule.
- Remove the simplified deploy rules duplicated in `scripts/release-pr-autofill.mjs` and reuse the real ones: `scripts/api-image-inputs.pattern` (read by `deploy-api.yml` with `grep -E`) and `scripts/vercel-ignore.sh` (the Vercel ignored build step).

### Non-Goals

- No change to `scripts/vercel-ignore.sh`, `scripts/api-image-inputs.pattern`, `deploy-api.yml` or any workflow.
- No change to the wording of the Deploys lines, the title, the releases or the commit groups.
- No prediction of other gates (CI paths, E2E, Cloud Run decisions based on the deployed image).
- No new dependency, no network call, no new install step.

## Impact

- `scripts/release-pr-autofill.mjs`: `deployTargets(files)` prefix logic is replaced by two I/O checks (pattern grep, `vercel-ignore.sh` run) feeding a pure body-line function.
- `apps/api/package.json`: the `test` target inputs gain the two files the integration test now reads through the script.
- `apps/api/__tests__/scripts/release-pr-autofill.test.ts`: integration cases updated and added.
- `AGENTS.md`: the release-pr-autofill workflow bullet states that deploy detection uses the real rules.
- Spec `release-pr-autofill`: requirement "Deploy detection" modified.

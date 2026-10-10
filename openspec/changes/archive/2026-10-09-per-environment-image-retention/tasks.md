# Tasks

## 1. Workflow

- [x] 1.1 `.github/workflows/deploy-api.yml`: map the target to `api-production` / `api-development` in the "Resolve deploy target" step and output the full image URI (`<region>-docker.pkg.dev/<project>/eco-metrics/<package>:<sha>`); use it in the build/push and deploy steps.

## 2. Policy

- [x] 2.1 `docs/deploy/artifact-registry-cleanup-policy.json`: one keep rule per package (`keepCount: 3`) and one delete rule for both packages (`tagState: any`, `olderThan: 1d`).

## 3. Docs

- [x] 3.1 `docs/deploy/cloud-run.md`: per-environment packages, the new retention, the one-time migration (redeploy both services, verify serving images, apply the policy, delete the legacy `api` package) and how to check repository size.

## 4. Validation

- [x] 4.1 `npx openspec validate per-environment-image-retention --strict`, actionlint, format check.
- [x] 4.2 Simulate the resolve step for both targets and check the image URI.
- [x] 4.3 Reviewer audit (APPROVED WITH NITS → applied: legacy-revision rollback limit, policy validation and dry-run wording, size check as printed by `describe`, §21 points to the full sequence).
- [x] 4.4 Document the post-push steps as the user-executed one-time sequence in the runbook (§16): verify both services serve the new packages, apply the policy, delete the legacy package, check the size.

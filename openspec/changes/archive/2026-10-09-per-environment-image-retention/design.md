# Design

## Context

`deploy-api.yml` pushes `<region>-docker.pkg.dev/<project>/eco-metrics/api:<sha>` for both targets. Artifact Registry cleanup policies can select versions by package name prefix, tag prefix, version name prefix, tag state and age, and can keep the N most recent versions; they cannot see which Cloud Run service uses an image. Measured on 2026-10-10: 31 images, 465.6 MB (layers are shared, ~15 MB per image on average); no cleanup policy set.

## Decisions

### D1 — One package per target

The target already maps to a service and its CORS variables in a single bash `case`; it now also maps to a package (`api-production` / `api-development`) and the step outputs the full image URI used by the build and deploy steps. A package per environment is the selector Artifact Registry policies understand natively, so retention can be expressed per environment without tag conventions. Change detection is unaffected: it reads the SHA after the `:` of whatever image the service serves.

Rejected: tag prefixes such as `prod-<sha>` (mixes environment into the version tag and makes the tag no longer a pure commit SHA, which change detection relies on); separate repositories (more IAM and setup for the same result).

### D2 — Keep 3 per package, delete the rest after 1 day

Two keep rules, one per package, each with `keepCount: 3`, so the count is per environment regardless of how Artifact Registry aggregates a single rule across packages. One delete rule matches only the two packages (`tagState: any`, `olderThan: 1d`); keep rules take precedence. Result: at most 3 images per environment (plus anything younger than a day), i.e. the serving image and two rollback candidates. Development churn can never delete a production image. The 1-day age avoids deleting an image that was pushed moments ago while a deploy is still rolling out.

Estimated storage: shared base plus ~6 × 15 MB ≈ 200–250 MB, ~350 MB while two dependency bases coexist; below 0.5 GB.

### D3 — Legacy package removed by hand, after the migration

The policy only matches the new packages, so it never touches anything it does not manage. The legacy `api` package is deleted once, explicitly, after both services serve images from the new packages (deleting it earlier would remove the image production currently runs).

## Risks / Trade-offs

- **Shallower rollback:** 2 previous images per environment. Older states are restored by reverting in git and redeploying.
- **Wrong migration order** (applying the deletion of the legacy package before production is redeployed) would break production cold starts; the runbook orders the steps and includes a check of the serving images.
- **Cleanup is asynchronous** (roughly daily): storage can exceed the steady state briefly; the cost of a short overshoot is a fraction of a cent.

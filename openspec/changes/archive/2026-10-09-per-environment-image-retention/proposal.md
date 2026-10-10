# Proposal

## Why

Both Cloud Run services push their images to the same Artifact Registry package (`eco-metrics/api`), so a cleanup policy cannot tell production images from development images. The current policy (keep the 20 most recent, delete only after 90 days) does not bound storage: the repository already holds 31 images / 465.6 MB of the 0.5 GB free tier after less than a month, and a count shared by both environments lets development churn push the image that serves production out of the kept set.

## What Changes

- `deploy-api.yml` publishes each target to its own package: `eco-metrics/api-production:<sha>` and `eco-metrics/api-development:<sha>`. The package is resolved in the existing "Resolve deploy target" step together with the service and CORS variables; tags stay immutable commit SHAs.
- The cleanup policy keeps the **3 most recent versions of each package** (one keep rule per package) and deletes any other version of those two packages once it is older than 1 day. It never matches other packages.
- The runbook documents the one-time migration: redeploy both services into the new packages, apply the policy, then delete the legacy `api` package by hand.

## Non-Goals

- No build-once-promote between environments (each target keeps building its own image, as today).
- No change to Cloud Run services, tags, change detection, or the deploy triggers.
- No automatic deletion from the workflow; applying the policy and removing the legacy package stay user-executed.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `api-cloud-run-deploy`: images are published to a per-target package; the cleanup policy keeps the 3 most recent versions per package and deletes the rest after 1 day.

## Impact

- `.github/workflows/deploy-api.yml`, `docs/deploy/artifact-registry-cleanup-policy.json`, `docs/deploy/cloud-run.md`.
- Artifact Registry: two new packages; the legacy `api` package (31 images) is removed after both services run images from the new packages. Expected storage ~200–350 MB, within the free tier.
- Rollback depth: the serving image plus the 2 previous ones per environment.

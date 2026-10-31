# Tasks: provider snapshot fallback

Order matters: shared types -> API storage -> API wiring -> config/deploy -> web -> tests/E2E -> docs -> gates. Read `AGENTS.md` ("Adding an OWID-backed category", "Known Constraints", Dependency Management) and, for the web tasks, `docs/design-system.md` before starting. Jest tests use `it(...)`, Playwright tests use `test(...)`. No test may reach the network or GCP. Check ports before build/E2E (the user's `next dev` may hold :3000). Write files with the Write/Edit tools, never bash heredocs.

**Deploy order after merge:** deploy the API before the web (payload contract and the Next Data Cache note in `AGENTS.md`); run the bucket setup (section 9 below, runbook) before the first push to `develop`.

## 1. Shared types (spec: `shared-types`, `api-response-type`)

- [x] 1.1 Add `stale?: boolean` to `ApiResponseMeta` in `packages/shared/src/lib/api-response.ts` and update the `fetchedAt` doc comment (time of the last successful provider fetch).
- [x] 1.2 Add shared type tests for the scenarios "Stale flag is optional" and "Stale flag is a boolean" (`@ts-expect-error` for the string case) and "meta may flag a stale snapshot"; keep coverage green.

## 2. API: storage abstraction (spec: `provider-snapshot-fallback`)

- [x] 2.1 Install `@google-cloud/storage` at the latest compatible version, pinned exact, in `apps/api/package.json` only (`npm install --save-exact -w apps/api @google-cloud/storage`); confirm `.npmrc` and the root lockfile are consistent.
- [x] 2.2 Create `apps/api/src/common/snapshots/snapshot-store.ts`: `SNAPSHOT_STORE` token, `SnapshotStore`, `StoredSnapshot<T>`, `SnapshotStat`, with English doc comments.
- [x] 2.3 Create `disabled-snapshot-store.ts` (no-op: `stat`/`read` -> `undefined`, `write` -> nothing).
- [x] 2.4 Create `gcs-snapshot-store.ts`: lazy client (never at construction or boot), ADC only, object `<prefix>/<key>.json`, `application/json`, `fetchedAt` and `contentHash` as custom metadata, `resumable: false`, bounded retries, `stat` via object metadata only, missing object -> `undefined`, corrupt body -> `undefined` plus a warning.
- [x] 2.5 Create `provider-snapshot.service.ts` with `resolve<T>(key, load)` implementing, in order: key validation (`/^[a-z0-9-]+$/`), `load()` success path (fresh result, in-memory last good value, SHA-256 hash of `JSON.stringify(payload)`, write policy with a first-success `stat` and per-key `lastPersisted`, 24 h threshold as a named constant, awaited writes, per-key in-flight dedupe), failure path (`ProviderError` only: in-memory value, else one `read`, else rethrow), non-`ProviderError` rethrown untouched, and a 5 s timeout plus catch-and-warn wrapper around every store call (never log the payload).
- [x] 2.6 Create `snapshots.module.ts` providing `SNAPSHOT_STORE` through a factory on `AppConfigService` (GCS store when bucket and prefix are set, otherwise disabled, logging which at boot) and `ProviderSnapshotService`; export the service.
- [x] 2.7 Unit tests (in `apps/api/__tests__/common/snapshots/`, stub in-memory `SnapshotStore` with call recording and injectable failures, fake timers for the 24 h cases): every scenario of "A storage port abstracts snapshot persistence", "A successful provider fetch is served fresh and remembered", "The snapshot is written only when content changed or the stored one is old", "The snapshot is read lazily and only when the provider fails" and "Storage failures never break a response or liveness" (including the never-settling store). GCS store tests with a stubbed client for "The GCS store writes one JSON object per key under the environment prefix" (path with prefix, environments do not collide, metadata-only `stat`, missing, corrupt). Zero warnings or errors in test output.

## 3. API: wiring into the three OWID modules (spec: `provider-snapshot-fallback`, `co2-emissions-api`, `global-temperature-api`, `energy-sources-api`)

- [x] 3.1 Change `buildOwidEnvelope(data, lastUpdated, { fetchedAt, stale })` in `providers/owid/owid-envelope.ts` to emit `meta.fetchedAt` and `meta.stale` from its arguments; update its existing tests.
- [x] 3.2 In `Co2EmissionsService`, `GlobalTemperatureService` and `EnergySourcesService`: inject `ProviderSnapshotService`; move the current method body into a private `assemble()` and make the public method return `resolve('<category slug>', () => this.assemble())`; call `recordProviderUpdate` only for fresh results (inside `assemble`). Import `SnapshotsModule` in each category module.
- [x] 3.3 Update the three controllers to pass `fetchedAt` and `stale` from the `Snapshotted` result to `buildOwidEnvelope`.
- [x] 3.4 Extend the three `*.controller.test.ts` suites (stub store via `SNAPSHOT_STORE` override): provider down with snapshot -> `200`, `meta.stale: true`, stored `fetchedAt`, stored `data`; provider down without snapshot -> `502`; provider up -> `meta.stale: false`; storage rejecting -> `200` fresh; disabled store -> unchanged behavior; plain `Error` -> `500` even with a snapshot; stale response does not advance the catalog's OWID `lastUpdated`. Fix existing API tests broken by the new `meta.stale` field and the new `SNAPSHOT_STORE` provider (`app.module.test.ts`, etc.).
- [x] 3.5 Add a health test (spec `health-module`): with all-rejecting store, `GET /api/v1/health` is `200` and no store method is called; assert `HealthController` has no snapshot dependency.

## 4. API: config and deploy (spec: `provider-snapshot-fallback`)

- [x] 4.1 Add `SNAPSHOT_BUCKET` (optional, empty allowed, GCS bucket-name pattern) and `SNAPSHOT_PREFIX` (kebab-case, required when the bucket is non-empty) to `apps/api/src/config/env-validation.schema.ts`, with clear messages.
- [x] 4.2 Add `snapshotBucket` and `snapshotPrefix` (`string | undefined`, empty -> `undefined`) to `AppConfigService`.
- [x] 4.3 Config tests for the scenarios "Unset bucket disables persistence", "Bucket without prefix fails fast", "Invalid values are rejected", "Both set enables the GCS store".
- [x] 4.4 Document both variables in `apps/api/.env.example` (commented out, with the free-tier and disabled-by-default note) and in the `README.md` environment table.
- [x] 4.5 Update `.github/workflows/deploy-api.yml`: read optional `vars.SNAPSHOT_BUCKET` in the target step (no pre-flight requirement), output it, and pass `SNAPSHOT_BUCKET=<value>` and `SNAPSHOT_PREFIX=<target>` to the Cloud Run `env_vars` only when non-empty (same optional-line mechanism as `CORS_ORIGIN_PATTERN`). No secrets, no keys.
- [x] 4.6 Verify `npx nx build api`, `npx nx run api:prune` and (if possible without sudo) that the pruned `dist` lists `@google-cloud/storage`; note any Docker build concern for the user to run with `sudo -v`.

## 5. Web: data layer and freshness (spec: `provider-data-freshness`)

- [x] 5.1 Extend `isMeta` in `apps/web/src/lib/bffFetch.ts` to accept an optional boolean `stale` and reject a non-boolean one; add `fetchProviderPayloadFromBff` per "A provider 502 is distinguished from other BFF failures" (provider `502` detection by JSON body `{ success: false, status: 502 }`; second attempt after a provider `502` uses `next: { revalidate: 300 }` via a named constant; all other failures throw as today).
- [x] 5.2 Create `apps/web/src/lib/providerFreshness.ts` (`FreshnessThresholds`, `DEFAULT_FRESHNESS_THRESHOLDS`, `evaluateFreshness`, threshold validation) per its requirement.
- [x] 5.3 Create `apps/web/src/components/icons/WarningIcon.tsx` following the existing icon pattern; export it from the barrel and extend the icon barrel tests (title -> `aria-labelledby`, none -> `aria-hidden`).
- [x] 5.4 Add the warning tokens to `apps/web/src/app/globals.css` (`:root`, `.dark`, `@theme inline`) with the starting values from `design.md` Decision 12; compute and record the contrast ratios; adjust palette steps if a threshold fails.
- [x] 5.5 Create `StaleDataNotice.tsx`, `DataUnavailable.tsx` and `ProviderBackedContent.tsx` in `apps/web/src/components/` with the exact copy, roles, `<time>` and `data-testid`s from the specs; tokens only; no interactive controls.
- [x] 5.6 In `apps/web/src/lib/categoryPages.tsx` add `defineProviderCategoryPage` (and the shared provider-name constant, commented as mirroring the API publisher); move `co2-emissions`, `global-temperature` and `energy-sources` onto it with `provider.name` and no override; leave `water-footprint` on `defineCategoryPage`. Switch `getCo2Emissions`, `getGlobalTemperature` and `getEnergySources` to `fetchProviderPayloadFromBff` (or add a provider-aware sibling, keeping their shape guards). Do not modify `[category]/page.tsx` or the three content components.
- [x] 5.7 Verify the ISR behavior from design Decision 11 against a production build (`next build && next start`) with the BFF stubbed to answer provider `502`: the degraded page must re-generate on the short revalidate and not stay cached for 24 h. If it does not behave so, stop and report to the user with the alternatives instead of shipping.
  - Verified (`next build && next start` on :3000, stub BFF on :3001 answering `502 { success: false, error, status: 502 }` or a real energy-sources payload captured from the built API against the E2E fixtures): with the BFF at `502`, `/energy-sources/` rendered "Data temporarily unavailable" with `x-nextjs-cache: MISS` and `Cache-Control: s-maxage=300, stale-while-revalidate=31535700`; after switching the stub to ok an immediate request was a `HIT` (still degraded, no BFF call); after 300 s the next request was `STALE` (degraded) and triggered one BFF call, and the following requests were `HIT` with the real charts. The degraded render therefore occupies a 300 s slot, not 24 h.

## 6. Web: tests

- [x] 6.1 `__tests__/lib/providerFreshness.test.ts`: every scenario of "Freshness is evaluated from the response meta with configurable thresholds" (boundaries exactly at 7 and 30 days, legacy meta, unparseable and future timestamps, override, invalid thresholds).
- [x] 6.2 `__tests__/lib/bffFetchProvider.test.ts` (pattern of `bffFetchRetry.test.ts`): every scenario of "A provider 502 is distinguished from other BFF failures" including the revalidate values per attempt, HTML `502`, and malformed `stale`.
- [x] 6.3 Component tests for `StaleDataNotice`, `DataUnavailable`, `ProviderBackedContent` and `WarningIcon`: copy, `<time>`, roles (`status`, never `alert`), no buttons, optional date line, attribution shown when meta is known.
- [x] 6.4 Extend `__tests__/lib/categoryPages.test.tsx`: the scenarios of "Provider-backed categories compose freshness, notice and unavailable state" (fresh, 14-day stale, 40-day stale, provider `502`, BFF unreachable still throws, override, registration, water-footprint unchanged).
- [x] 6.5 Confirm `designTokens.test.ts` passes without new exceptions and that the warning tokens are found as consumed; update existing web tests/snapshots that enumerate meta shapes if needed (diff `.snap` files before accepting).

## 7. E2E (spec: `provider-data-freshness`, last requirement)

- [x] 7.1 In `co2-emissions.spec.ts`, `global-temperature.spec.ts` and `energy-sources.spec.ts` add one `test(...)` each asserting the stale notice and unavailable state test ids are absent while the charts are visible. Do not add a failure mode to the OWID fixture server (design Decision 13).
- [x] 7.2 Run `npm run e2e` (ports free) and confirm the existing axe and SEO specs still pass.

## 8. Docs

- [x] 8.1 `docs/design-system.md`: add the warning tokens to the Color Tokens table (matching `globals.css`), the contrast ratios, the "Stale notice" and "Unavailable state" patterns and the thresholds (spec `presentation-docs`).
- [x] 8.2 `docs/deploy/cloud-run.md`: add the one-time snapshot bucket section (Cloud Shell commands for bucket creation in `us-central1` with `--default-storage-class=STANDARD`, `--uniform-bucket-level-access`, `--public-access-prevention` and `--soft-delete-duration=0`; IAM binding of `roles/storage.objectAdmin` on the bucket only for the runtime service account, reusing the runbook's discovery command; setting `SNAPSHOT_BUCKET`), the verification step (`gcloud storage ls gs://<bucket>/development/`), the rollout order, the free-tier note, the US$1 project budget with 10% / 50% / 100% thresholds (`gcloud services enable billingbudgets.googleapis.com`, `gcloud billing accounts list`, `gcloud billing budgets create`; verify the flags with `--help` docs, do not guess), the note that alerts notify but do not cap spending and lag by hours, where to see usage (Billing -> Reports filtered by Cloud Storage, bucket Observability tab), and the troubleshooting entry for unsetting the variable (`--remove-env-vars`). Update the free-tier section 16 cross-reference.
- [x] 8.3 `AGENTS.md`: update "Adding an OWID-backed category" and the structure tree (`common/snapshots/`, web components and `providerFreshness.ts`, `SNAPSHOT_*`) per the `category-page-registry` delta; keep the "Known Constraints" Next Data Cache note and mention that a stale payload is cached like any `200`.
- [x] 8.4 `ROADMAP.md`: remove the BFF resilience item block, renumber all subsequent `Pxx`/`Dxx`/`Ixx` IDs without gaps and update every cross-reference (status table, action plan, other items, the `AGENTS.md` mention of an ID if any); bump the "last updated" date. Do not touch archived changes.
- [x] 8.5 Check `README.md` (env table, features/architecture mentions) and the `apps/api/README.md` for places that describe the 502 behavior or env vars and update them.

## 9. Gates and rollout notes

- [x] 9.1 Run `npm run lint`, `npm run build`, `npm run test` (coverage thresholds, zero warnings), `npm run e2e`, and `npx openspec validate provider-snapshot-fallback --strict`; all must pass.
- [x] 9.2 Manual local review with the user (nothing from this step is committed): (a) unavailable without a snapshot: start the API with `OWID_GRAPHER_BASE_URL` / `OWID_API_BASE_URL` pointing at an unreachable address; (b) stale notice and (c) over-the-limit unavailable (reviewed with the initial 2- and 7-day defaults, later raised to 7 and 30): a temporary local patch making the snapshot service serve `stale: true` with a `fetchedAt` 3 and 10 days old. Delete `apps/web/.next/dev/cache` between states. Revert the patch and confirm `git status` shows none of it.
- [x] 9.3 Hand the user the rollout checklist: (1) run the new runbook section in Cloud Shell (bucket, IAM, budget alert) and set the `SNAPSHOT_BUCKET` repository variable, (2) push to `develop`, (3) call the three dev endpoints once and run `gcloud storage ls gs://<bucket>/development/`, expecting three objects, (4) open the PR `develop` -> `main`. Confirm the API deploy precedes the web deploy.

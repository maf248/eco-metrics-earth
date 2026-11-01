# Design: provider snapshot fallback

Read with `proposal.md` (goals, non-goals) and the delta specs. Reference code: `apps/api/src/modules/providers/owid/` (`OwidClient`, `buildOwidEnvelope`, `OwidProviderStatus`), `apps/api/src/common/errors/provider-error.ts`, `apps/web/src/lib/bffFetch.ts`, `apps/web/src/lib/categoryPages.tsx`.

## Technical approach

### Decision 1: One storage port, two implementations, one wrapper

New folder `apps/api/src/common/snapshots/` (`common/` never imports `modules/`):

```
snapshot-store.ts            SNAPSHOT_STORE token + SnapshotStore interface + StoredSnapshot / SnapshotStat types
gcs-snapshot-store.ts        GCS implementation (@google-cloud/storage)
disabled-snapshot-store.ts   no-op implementation (stat/read -> undefined, write -> nothing)
provider-snapshot.service.ts ProviderSnapshotService: the only thing a category uses
snapshots.module.ts          provides SNAPSHOT_STORE (factory on AppConfigService) + ProviderSnapshotService; exports the service
```

```ts
interface StoredSnapshot<T> {
  fetchedAt: string;
  contentHash: string;
  payload: T;
}
interface SnapshotStat {
  fetchedAt: string;
  contentHash: string;
}
interface SnapshotStore {
  stat(key: string): Promise<SnapshotStat | undefined>; // metadata only, no payload download
  read<T>(key: string): Promise<StoredSnapshot<T> | undefined>; // payload download
  write<T>(key: string, snapshot: StoredSnapshot<T>): Promise<void>;
}
```

`key` is a kebab-case string (validated `/^[a-z0-9-]+$/`), by convention the category slug. The store, not the caller, applies the environment prefix.

The wrapper is the only API a category needs:

```ts
interface Snapshotted<T> { payload: T; fetchedAt: string; stale: boolean }
ProviderSnapshotService.resolve<T>(key: string, load: () => Promise<T>): Promise<Snapshotted<T>>
```

Behaviour of `resolve`:

1. Call `load()`. On success: `fetchedAt = now`, remember `{ payload, fetchedAt }` in memory as the last good value, run the write policy (Decision 3), return `stale: false`.
2. On a `ProviderError`: use the in-memory last good value if there is one; otherwise `store.read(key)` (and remember the result: a snapshot is kept for the life of the instance; "nothing stored" is remembered for 1 h and a failed read for 1 min, so an outage costs one read per window, not one per request). If a snapshot is found, log a warning and return it with `stale: true` and its stored `fetchedAt`. If none, rethrow the original `ProviderError` (the global filter answers `502` as today).
3. Any other error (a bug, a plain `Error`) is rethrown untouched: it stays `500`, never masked by a snapshot.
4. Every store call is wrapped: errors and timeouts (5 s constant) are caught, logged at `warn` (key, operation, error name and message; never the payload) and treated as "nothing stored" / "write skipped". A store failure never changes the outcome of a successful `load()`.

`load` is the category service's existing assembly (provider calls plus the pure builder), so what is stored is exactly the assembled payload the endpoint serves: `{ data, lastUpdated }` for the OWID categories. The envelope is rebuilt on every response from the stored `lastUpdated` plus the current publisher definition, so a snapshot never freezes attribution text.

### Decision 2: Object layout

One object per category per environment: `gs://<bucket>/<prefix>/<key>.json` (for example `production/energy-sources.json`, `development/co2-emissions.json`). Body: the `StoredSnapshot` JSON. The same `fetchedAt` and `contentHash` are written as custom object metadata, so `stat` is a metadata request and never downloads the payload. Uploads use `resumable: false` (a resumable upload spends several Class A operations). Soft delete and versioning are off at the bucket, so an overwrite leaves nothing billed behind.

The GCS client is created lazily on first use (never in the constructor or at boot), authenticates with Application Default Credentials (the Cloud Run runtime service account; no keys, no secrets), and uses bounded retries.

### Decision 3: Write policy (free-tier critical)

Per key, the service keeps `lastPersisted: { hash, at }` in memory. After each successful `load()` it computes `hash = sha256(JSON.stringify(payload))` (assembly is deterministic, so equal content gives equal hash) and decides:

- Known `lastPersisted` (not the first success in this process): write when `hash` differs or `now - at >= 24 h`.
- First success in this process: one `stat(key)`. Write when nothing is stored, the stored hash differs, or `now - stat.fetchedAt >= 24 h`; otherwise record `lastPersisted = { hash, at: stat.fetchedAt }` and skip.
- After a successful write, `lastPersisted = { hash, at: now }`.
- `stat` is attempted at most once per key per process, whatever its outcome: when it fails or times out the write proceeds as if nothing were stored, and `stat` is never retried.
- After a failed or timed-out write the key is not written again for 1 h (`SNAPSHOT_WRITE_BACKOFF_MS`), so a missing IAM binding or an outage costs about one operation per hour instead of one per response; the first success after the window tries again.
- The whole persistence step on the response path is bounded by one 5 s timeout, however many store calls the policy makes, so a hung bucket delays a response by at most 5 s.

The first-success `stat` is the one deliberate refinement of "do not read on every cold start": it is a metadata-only Class B operation, once per key per process, and it is what makes "write at most about once a day" true across cold starts (without it every cold start would have to write). A write that only refreshes an unchanged payload still advances the stored `fetchedAt`; consequently a stale response's `fetchedAt` can lag the true last provider success by up to about 24 h, negligible against the 7-day web threshold. Writes are awaited within that single timeout (Cloud Run throttles CPU after the response, so fire-and-forget is unreliable) and run in-flight-deduplicated per key.

### Decision 4: Read policy

The snapshot payload is downloaded only on provider failure (step 2 above) and then kept in memory for the life of the instance. A healthy cold start never downloads a payload.

### Decision 5: Free-tier budget (us-central1, Standard, 5 GB / 5,000 Class A / 50,000 Class B per month, same-region egress free)

| Item                           | Estimate                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Storage                        | 3 categories x 2 environments, a few MB each, far below 5 GB                                                                        |
| Class A (writes)               | at most ~1/day/key/env: 3 x 2 x 30 = ~180/month, plus changed-content writes (rare); limit 5,000                                    |
| Class B (`stat`, payload read) | one `stat` per key per cold start: 3 per cold start; even 1,000 cold starts/month = 3,000; reads only during outages; limit 50,000  |
| Network                        | Cloud Run (us-central1) to the bucket in the same region: free; the project's deploy region must be us-central1 (runbook checks it) |

Cleanup: none needed (one object per key, overwritten in place).

### Decision 6: Response contract

`ApiResponseMeta` becomes `{ source; fetchedAt; stale?: boolean }`. `stale` is optional in the type so the water-footprint and data-sources builders stay untouched, and so the web accepts payloads written to the Next Data Cache before this change (absent means fresh). The three OWID endpoints always emit `stale` explicitly (`false` or `true`). `fetchedAt` now means "time of the last successful provider fetch of this payload": the assembly time for a fresh response, the stored `fetchedAt` for a stale one. `buildOwidEnvelope(data, lastUpdated, { fetchedAt, stale })` takes them from the `Snapshotted` result. `recordProviderUpdate` is only called on a fresh result.

`502` is unchanged (constant body, global filter, `ProviderError`).

### Decision 7: Wiring the three OWID services

Each of `Co2EmissionsService`, `GlobalTemperatureService`, `EnergySourcesService` injects `ProviderSnapshotService` and its public method becomes `resolve(<category>, () => this.assemble())`, where `assemble` is the current method body; the controller passes `fetchedAt` and `stale` to `buildOwidEnvelope`. `SnapshotsModule` is imported by each category module (or marked global; see Decision 12). Pure builders and the provider client are not touched. A future category does the same three edits.

### Decision 8: Configuration

- `SNAPSHOT_BUCKET`: optional (unset or empty disables persistence), validated as a GCS bucket name.
- `SNAPSHOT_PREFIX`: kebab-case; validated whenever it is set, and required when `SNAPSHOT_BUCKET` is set (a half-configured service fails fast at boot, visible in the deploy).
- `AppConfigService.snapshotBucket` and `.snapshotPrefix` return `string | undefined`. `SnapshotsModule` provides `GcsSnapshotStore` when both are set, otherwise `DisabledSnapshotStore` (one `log` line at boot says which).
- `deploy-api.yml`: an optional repository variable `SNAPSHOT_BUCKET` (not checked by pre-flight); when non-empty the deploy passes `SNAPSHOT_BUCKET=<value>` and `SNAPSHOT_PREFIX=<target>` (`production` or `development`) through the same optional-line mechanism as `CORS_ORIGIN_PATTERN`. Because the deploy action merges env vars, unsetting the variable later does not remove it from the service; the runbook documents `--remove-env-vars`. No secret and no key: access is IAM on the runtime service account.
- Dependency: `@google-cloud/storage` pinned exact in `apps/api/package.json` only; confirm webpack bundles or externalizes it consistently with the other dependencies and that `nx run api:prune` (CI) and the Docker build still produce a working image.

### Decision 9: Web — provider-aware read

`apps/web/src/lib/bffFetch.ts` gains `fetchProviderPayloadFromBff<T>(options)` built on the same attempt loop (2 attempts, 10 s, shape guard, Data Cache bypass after a shape mismatch). It returns a discriminated result:

```ts
type ProviderPayloadResult<P> = { kind: 'ok'; payload: P } | { kind: 'provider-unavailable' };
```

`provider-unavailable` is returned only when the final attempt got HTTP `502` with a JSON body `{ success: false, status: 502 }` (our BFF's provider error; a Cloud Run/infra `502` HTML page is not that and still throws). Everything else (timeouts, other non-2xx, shape mismatches, BFF unreachable) throws exactly as today, so ISR keeps the last good page and `error.tsx` is the fallback. `isMeta` accepts an optional boolean `stale` and rejects a non-boolean one.

### Decision 10: Web — freshness, registry, components

- `lib/providerFreshness.ts` (pure): `FreshnessThresholds { silentDays: 7, noticeDays: 30 }` as `DEFAULT_FRESHNESS_THRESHOLDS`, and `evaluateFreshness(meta, now, thresholds)` returning `{ kind: 'fresh' } | { kind: 'stale-notice', fetchedAt } | { kind: 'unavailable', fetchedAt? }`. `stale` absent or false is always `fresh` whatever `fetchedAt` says. Stale with age <= `silentDays` is `fresh`; <= `noticeDays` is `stale-notice`; above that, or an unparseable `fetchedAt`, is `unavailable`. A `fetchedAt` in the future (clock skew) counts as age 0. Thresholds are validated (`0 <= silentDays < noticeDays`).
- Registry: `categoryPages.tsx` gets `defineProviderCategoryPage<P>({ provider: { name, freshness? }, load, Content })`. It returns a normal `CategoryPageDefinition` whose `load` calls `load`, evaluates freshness once with `Date.now()` (in `load`, so render stays pure) and returns a resolved state, and whose `Content` is the generic `ProviderBackedContent`. `[category]/page.tsx` is unchanged and still does not catch `load()` errors. Water footprint keeps `defineCategoryPage`.
- `provider.name` is a literal declared once per registry entry (a shared `OWID_PROVIDER_NAME` constant in the file) because a `502` has no `meta`. Whenever `meta.source.provider` exists (fresh, stale notice, over-threshold stale) it is used instead; the literal only serves the no-meta case.
- Components (`apps/web/src/components/`): `StaleDataNotice` (banner, `role="status"`, copy "{Provider} is currently unreachable. Showing the copy we retrieved on {date}.", date through `formatUtcDate` in a `<time>`), `DataUnavailable` (`role="status"`, `<h2>` "Data temporarily unavailable", body "We couldn't reach {Provider} to load this data. We're keeping an eye on it and it should be back soon.", optional "Last retrieved from {Provider}: {date}" only when a date is known, `WarningIcon` `aria-hidden`, no button), `ProviderBackedContent` (renders `Content`, or notice plus `Content`, or `DataUnavailable`; when `meta` is known in the unavailable case it also renders `DataAttribution` so the source credit stays visible; the JSON-LD and charts live inside `Content` and are skipped). The three category content components are not modified. In this version a page has one section, so "the section" is everything under the common header (icon and `<h1>` stay).
- `components/icons/WarningIcon.tsx` follows the existing icon pattern (barrel export, `title` prop, `aria-hidden` when untitled).

### Decision 11: ISR interaction and the safest behaviour

Facts: pages use `revalidate = 86400` and the BFF read uses `next: { revalidate: 86400 }`; the Data Cache persists across deployments (`AGENTS.md`). Next caches a fetch response only when it is a `200`, and a page's effective revalidate is the minimum across the fetches of the render. Today a throwing render during revalidation keeps the last good page (stale-if-error).

Risk: if a `502` renders "unavailable", that HTML replaces a good cached page for 24 h.

Chosen behaviour:

1. Our own BFF failing or unreachable (not a provider `502`): keep throwing (unchanged).
2. Provider `502` and the BFF has a snapshot: cannot happen, the BFF returns `200` stale instead. In practice a `502` reaches the web only when no snapshot can be served: a new environment before its first successful fetch, persistence disabled, or the snapshot read failing. In the last two cases a good page may already be cached, and a revalidation during the outage replaces it with the unavailable state; rule 3 keeps that degraded page on a 300 s revalidation, so the good page comes back within minutes of the provider (or storage) recovering. With persistence configured and healthy this cannot happen after the first success; the exposure is accepted.
3. Provider `502` is rendered as the unavailable state, but the degraded render must not occupy the 24 h slot. When the first attempt returns a provider `502`, the retry is issued with `next: { revalidate: DEGRADED_REVALIDATE_SECONDS }` (300 s). Because the lowest fetch revalidate wins, a page whose attempts end in `502` re-generates within minutes; a `502` is never Data-Cached. If the retry succeeds, the page is a good page that will simply revalidate sooner than usual.
4. A stale `200` is cached normally (a stale response is a legitimate, still-useful payload). Consequence: after OWID recovers, a cached stale response can keep the banner for up to one more revalidation window; a page rendered at 6.9 days of age can show no notice for up to ~24 h more. Worst case the thresholds lag by ~24 to 48 h. Accepted and documented; refreshing sooner is not worth extra BFF traffic.
5. The over-30-days unavailable state from a `200` stale payload follows rule 4 (cached up to 24 h). Replacing a cached good page is not a concern there, because the BFF only answers stale when it has no fresher data.

The coder MUST verify rule 3 against the production build (`next build && next start`, BFF stubbed to `502`) before relying on it. If Next does not shorten the page's revalidation from the per-fetch option, stop and raise the alternatives with the user (for example on-demand revalidation of the degraded page); do not ship a degraded render that is cached for 24 h.

### Decision 12: Design system

Three tokens declared in `globals.css` (`:root` and `.dark`), mapped in `@theme inline`, consumed by the new components and listed in the Color Tokens table: `warning-surface` (notice background), `warning-line` (notice border), `warning-fg` (notice text and warning icon). Proposed starting values (amber family, `oklch()` like the other UI tokens): light surface amber-50, line amber-300, fg amber-900; dark surface amber-950, line amber-800, fg amber-100. The coder verifies WCAG contrast (text >= 4.5:1 on its surface, icon >= 3:1 on the surface it sits on, in both themes), records the ratios in `docs/design-system.md` and adjusts steps if any fails. Not red, so it never reads as an error. The unavailable panel itself uses existing neutral tokens (`surface-raised`, `line-strong`, `fg`, `fg-body`) with the icon in `warning-fg`. `designTokens.test.ts` needs no new exception: no palette utility appears in components. `docs/design-system.md` also documents the two patterns (placement, copy, roles, no retry button, neutral tone).

### Decision 13: Tests and E2E

API unit tests use a stub `SnapshotStore` (in-memory, call-recording, injectable failures) and fake timers where needed; no network, no GCP. Web tests use Jest with `it(...)`.

E2E: no failure mode is added to the OWID fixture server. All specs share one `webServer`, the BFF holds an in-memory OWID cache (24 h) and Next holds a 24 h Data Cache, so flipping the fixture server to fail at run time is order-dependent and flaky, while making it fail from the start would break the existing specs. The unavailable and stale paths are covered by unit tests of the loader, the freshness function, the components and the registry composition. E2E adds one assertion per OWID spec that a healthy provider shows neither the notice nor the unavailable state (E2E has no bucket, so responses are `stale: false`); the existing axe spec keeps covering the healthy pages. Axe on the new states is not feasible without a Playwright-visible degraded page and is replaced by token contrast verification plus role/semantics unit tests. Revisit if a deterministic per-test BFF override appears.

### Decision 14: Bucket and ops (runbook)

`docs/deploy/cloud-run.md` gets a new numbered section with Cloud Shell commands (bucket in `us-central1`, `--default-storage-class=STANDARD`, `--uniform-bucket-level-access`, `--public-access-prevention`, soft delete disabled with `--soft-delete-duration=0`, IAM binding of `roles/storage.objectAdmin` for the runtime service account on that bucket only, reusing the doc's runtime-SA discovery command), setting the `SNAPSHOT_BUCKET` repository variable, verification (`gcloud storage ls gs://<bucket>/development/` after the dev deploy), a free-tier note, and a budget alert created from Cloud Shell (enable `billingbudgets.googleapis.com`, find the billing account with `gcloud billing accounts list`, then `gcloud billing budgets create` scoped to the project with a US$1 monthly amount and threshold rules at 10%, 50% and 100%; email goes to the billing admins). The runbook states that a budget alert only notifies and never stops spending, that cost data lags by several hours, and where to see usage: Billing -> Reports filtered by the Cloud Storage service, and the bucket's Observability tab for request counts by operation. `roles/storage.objectAdmin` is used because overwriting an object needs create and delete; scope is the single bucket. Rollout order: setup, push to `develop`, verify `development/*.json` after hitting the three endpoints once, then PR `develop` -> `main`.

## Alternatives considered

- **Firestore.** A document store is overkill for three blobs, has its own free-tier quotas and a client with heavier startup; GCS objects map 1:1 to "one snapshot per category". Rejected (also out of scope per the brief).
- **Snapshot baked into the image.** Free and trivial, but data is as old as the last deploy and never refreshes. Rejected.
- **Cloud Run min-instances=1 / longer in-memory TTL.** Costs money (min instance) or does not survive scale-to-zero. Rejected.
- **Write on every successful fetch.** Violates the 5,000 Class A/month budget with frequent cold starts. Rejected for the hash-plus-age policy.
- **No `stat` on first success (write once per cold start).** Simpler but breaks the budget under many cold starts; the metadata `stat` is cheap Class B. Rejected.
- **BFF applies the age threshold.** Mixes presentation policy into the BFF and would make the contract per-consumer. Rejected; the web decides.
- **Store raw upstream CSV/JSON.** More objects, bigger, and the assembly would have to be re-run on a degraded path. Rejected.
- **Add `meta` to the `502` body so the web gets the provider name.** Changes the constant provider-error contract and the global filter, which has no category context. Rejected; the registry declares the name for that single case.
- **Throw instead of rendering the unavailable state on `502`.** Safest for ISR, but a never-generated page would show `error.tsx` and the requirement is a graceful section state. Rejected in favour of the short-revalidate mitigation.
- **Fire-and-forget writes.** CPU is throttled after the response on Cloud Run request-based billing, so the write could stall. Rejected for awaited writes with a timeout.
- **Global storage module vs imported per module.** Either works; import per category module keeps dependencies explicit and mirrors `OwidModule`. Chosen: explicit import.

## Risk assessment

| Risk                                                                   | Mitigation                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exceeding the free tier (writes in a cold-start loop)                  | Hash-plus-24 h write policy, in-memory `lastPersisted`, `stat` only once per key per process, unit-tested counts; billing alert in the runbook                                                  |
| GCS outage or missing IAM turns good responses into errors             | Every store call wrapped with timeout and `warn`; a failed write or `stat` is swallowed; test with a throwing store                                                                             |
| Persistence adds latency to cold starts                                | One `stat` per key (tens of ms) with a 5 s cap; the three categories are requested independently                                                                                                |
| Liveness affected by storage                                           | Client created lazily, no storage call at boot or in `HealthController`; test asserts `/health` with a failing store                                                                            |
| Replacing a good ISR page with "unavailable"                           | Decision 11: short revalidate for degraded `502` renders, stale `200` is real data; verification step required                                                                                  |
| Old Data Cache entries without `stale`                                 | `stale` optional in the type and guard; API deployed before web                                                                                                                                 |
| Misread staleness (snapshot `fetchedAt` lags up to 24 h)               | Documented; thresholds are in days                                                                                                                                                              |
| Snapshot with an old payload contract after a type change              | Snapshot is only served after the web's shape guard passes; a mismatch makes the page throw like any old payload; contract changes to a category payload should clear its object (runbook note) |
| Dev and prod writing the same object                                   | Environment prefix from `SNAPSHOT_PREFIX=<target>`; a test asserts the object path                                                                                                              |
| `@google-cloud/storage` bloats the bundle or breaks `api:prune`/Docker | Verify `nx build api`, `nx run api:prune` and the image build; fall back to externals like other deps if needed                                                                                 |
| Provider name literal drifts from `OWID_PUBLISHER.provider`            | Single constant per registry file, commented as mirroring the API publisher name; `meta.source.provider` wins whenever present                                                                  |

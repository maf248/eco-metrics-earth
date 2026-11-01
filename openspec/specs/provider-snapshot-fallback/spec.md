# provider-snapshot-fallback Specification

## Purpose

Define how the API keeps the last good payload of each provider-backed category in Cloud Storage and serves it, flagged as stale, when the provider fails.

## Requirements

### Requirement: A storage port abstracts snapshot persistence

The API SHALL define, in `apps/api/src/common/snapshots/`, a `SnapshotStore` interface (`stat`, `read`, `write`) behind the injection token `SNAPSHOT_STORE`, with a GCS implementation and a disabled implementation, and a `ProviderSnapshotService` exposing `resolve<T>(key, load)` that returns `{ payload, fetchedAt, stale }`. Nothing in `common/snapshots/` SHALL import from `modules/` or reference a specific provider. A provider-backed category SHALL opt in by calling `resolve` around its existing assembly, with no other storage code. A `key` SHALL match `/^[a-z0-9-]+$/`. `stat` SHALL return only the stored `fetchedAt` and `contentHash` without downloading the payload.

#### Scenario: A category opts in with one call

- **GIVEN** a category service whose assembly is `() => Promise<R>`
- **WHEN** it calls `resolve('my-category', assembly)`
- **THEN** it receives `{ payload: R, fetchedAt, stale }` and needs no store, hash or timestamp code of its own

#### Scenario: Invalid key is rejected

- **WHEN** `resolve('Bad Key!', load)` is called
- **THEN** it throws before any store or provider call

#### Scenario: Disabled store does nothing

- **GIVEN** the disabled store
- **WHEN** `stat`, `read` and `write` are called
- **THEN** `stat` and `read` resolve `undefined`, `write` resolves without effect, and no network access happens

### Requirement: A successful provider fetch is served fresh and remembered

When `load()` succeeds, `resolve` SHALL return its result with `stale: false` and `fetchedAt` set to the current time, and SHALL remember `{ payload, fetchedAt }` in memory as the last good value of that key.

#### Scenario: Fresh result

- **GIVEN** `load` resolves a payload
- **WHEN** `resolve('cat', load)` runs
- **THEN** it returns that payload with `stale: false` and an ISO `fetchedAt` equal to the call time

#### Scenario: Last good value survives a later failure in the same instance

- **GIVEN** a first `resolve` succeeded and `load` now throws a `ProviderError`
- **WHEN** `resolve` runs again
- **THEN** it returns the first payload with `stale: true` and the first `fetchedAt`, without reading the store

### Requirement: The snapshot is written only when content changed or the stored one is old

After a successful `load()`, `resolve` SHALL compute a SHA-256 content hash of the payload and persist it per this policy, so the store receives at most about one write per key per day regardless of cold starts. On the first success of a key in a process it SHALL call `stat(key)` and write when nothing is stored, the stored hash differs, or the stored `fetchedAt` is 24 hours old or more; otherwise it SHALL write nothing. On later successes in the same process it SHALL write when the hash differs from the last persisted one or the last persisted time is 24 hours old or more. `stat` SHALL be attempted at most once per key per process, whatever its outcome; when it fails or times out the write proceeds as if nothing were stored. After a failed or timed-out write the key SHALL NOT be written again for 1 hour, including when the content changed in the meantime; the first success after that window SHALL try again. The whole persistence step SHALL be awaited within a single 5 second timeout, however many store calls the policy makes. `resolve` SHALL NOT download a payload on a successful path.

#### Scenario: Nothing stored yet

- **GIVEN** `stat` returns `undefined`
- **WHEN** a first successful `resolve` runs
- **THEN** exactly one `stat` and one `write` happen, and `write` receives the payload, the hash and `fetchedAt`

#### Scenario: Unchanged and fresh snapshot is not rewritten

- **GIVEN** `stat` returns the same hash and a `fetchedAt` 2 hours ago
- **WHEN** a successful `resolve` runs
- **THEN** no `write` happens

#### Scenario: Changed content is written

- **GIVEN** `stat` returns a different hash and a `fetchedAt` 2 hours ago
- **WHEN** a successful `resolve` runs
- **THEN** one `write` happens

#### Scenario: Old snapshot is refreshed even if unchanged

- **GIVEN** `stat` returns the same hash and a `fetchedAt` 25 hours ago
- **WHEN** a successful `resolve` runs
- **THEN** one `write` happens

#### Scenario: Repeated successes in one process cost nothing

- **GIVEN** a first success persisted (or skipped) the snapshot
- **WHEN** `resolve` succeeds again with identical content within 24 hours
- **THEN** neither `stat` nor `write` is called again

#### Scenario: A later change in the same process is written

- **GIVEN** a persisted snapshot and a later success with different content
- **WHEN** `resolve` runs
- **THEN** one `write` happens without a new `stat`

#### Scenario: Time threshold applies in the same process

- **GIVEN** a snapshot persisted 25 hours ago in this process and a success with identical content
- **WHEN** `resolve` runs
- **THEN** one `write` happens

#### Scenario: A failing write backs off for one hour

- **GIVEN** a store whose `write` rejects
- **WHEN** `resolve` succeeds five times in a row within the hour, even with changing content
- **THEN** exactly one `write` was attempted, and after the hour passes the next success attempts one more

#### Scenario: Stat is attempted once per process

- **GIVEN** a store whose `stat` rejects or never settles
- **WHEN** `resolve` succeeds several times for the same key
- **THEN** `stat` was called exactly once

#### Scenario: A hung store bounds the persist step

- **GIVEN** a store whose `stat` and `write` never settle
- **WHEN** `resolve` succeeds
- **THEN** it returns the fresh result after a single 5 second timeout, not one timeout per store call

### Requirement: The snapshot is read lazily and only when the provider fails

When `load()` throws a `ProviderError` and the key has no in-memory last good value, `resolve` SHALL call `store.read(key)`, remember a found snapshot in memory for the life of the instance, and, if a snapshot exists, return its payload with `stale: true` and the stored `fetchedAt`, logging a warning. If no snapshot exists it SHALL rethrow the original `ProviderError`, and SHALL remember "nothing stored" for 1 hour (a failed or timed-out read for 1 minute) so that an outage costs one read per window rather than one per request. Errors that are not `ProviderError` SHALL be rethrown unchanged and SHALL NOT trigger a read. `resolve` SHALL apply no age threshold.

#### Scenario: Provider fails and a snapshot exists

- **GIVEN** `load` throws a `ProviderError` and the store holds a snapshot with `fetchedAt` 10 days ago
- **WHEN** `resolve` runs
- **THEN** it returns the stored payload with `stale: true` and `fetchedAt` 10 days ago, and exactly one `read` happened

#### Scenario: Provider fails and nothing is stored

- **GIVEN** `load` throws a `ProviderError` and the store has no snapshot
- **WHEN** `resolve` runs
- **THEN** the original `ProviderError` is rethrown

#### Scenario: Second failure does not read again

- **GIVEN** a stale result was served from a stored snapshot
- **WHEN** `load` fails again in the same process
- **THEN** the in-memory snapshot is served and `read` is not called again

#### Scenario: Healthy cold start never reads

- **GIVEN** `load` succeeds
- **WHEN** `resolve` runs
- **THEN** `read` is never called

#### Scenario: Programming errors are not masked

- **GIVEN** `load` throws a plain `Error` and a snapshot exists
- **WHEN** `resolve` runs
- **THEN** the plain `Error` is rethrown and the store is not read

#### Scenario: An empty read is remembered

- **GIVEN** `load` throws a `ProviderError` repeatedly and the store holds no snapshot
- **WHEN** `resolve` runs five times within an hour
- **THEN** `read` was called once, and it is called again after the hour passes

#### Scenario: A failed read is retried sooner

- **GIVEN** `load` throws a `ProviderError` and `read` rejects
- **WHEN** `resolve` runs again within a minute, and again after a minute
- **THEN** `read` is not called in the first case and is called once more in the second

### Requirement: Storage failures never break a response or liveness

Every `SnapshotStore` call made by `ProviderSnapshotService` SHALL be guarded by a timeout and a catch that logs a warning (key, operation, error name and message, never the payload) and treats the call as "nothing stored" or "write skipped". A storage failure SHALL NOT change the outcome of a successful `load()`. The GCS client SHALL be created lazily on first use and SHALL NOT be touched at application boot or by `GET /api/v1/health`.

#### Scenario: Write failure is swallowed

- **GIVEN** a store whose `write` rejects and a successful `load`
- **WHEN** `resolve` runs
- **THEN** it returns the fresh result with `stale: false` and a warning is logged

#### Scenario: Stat failure is swallowed

- **GIVEN** a store whose `stat` rejects and a successful `load`
- **WHEN** `resolve` runs
- **THEN** the fresh result is returned and the write is attempted as if nothing were stored

#### Scenario: Read failure falls back to the provider error

- **GIVEN** `load` throws a `ProviderError` and `read` rejects
- **WHEN** `resolve` runs
- **THEN** the original `ProviderError` is rethrown and a warning is logged

#### Scenario: Slow storage is cut off

- **GIVEN** a store call that never settles
- **WHEN** `resolve` runs
- **THEN** it continues after the timeout and returns the provider result

#### Scenario: Liveness is independent of storage

- **GIVEN** a store whose every method rejects
- **WHEN** `GET /api/v1/health` is called
- **THEN** the response is `200` with `{ "status": "ok" }` and no store method was called

### Requirement: The GCS store writes one JSON object per key under the environment prefix

`GcsSnapshotStore` SHALL read and write the object `<SNAPSHOT_PREFIX>/<key>.json` in the bucket `SNAPSHOT_BUCKET`, with content type `application/json`, the `fetchedAt` and `contentHash` also set as custom object metadata, non-resumable uploads, bounded retries, and authentication through Application Default Credentials only (no key file, no secret). `stat` SHALL read object metadata only. A missing object SHALL resolve `undefined` for `stat` and `read`. A stored object that is not valid JSON of the expected shape SHALL be treated as missing with a warning.

#### Scenario: Object path includes the environment prefix

- **GIVEN** prefix `development` and key `energy-sources`
- **WHEN** a snapshot is written
- **THEN** the object `development/energy-sources.json` is created in the configured bucket

#### Scenario: Environments do not collide

- **GIVEN** two stores with prefixes `production` and `development` and the same key
- **WHEN** both write
- **THEN** they write different objects

#### Scenario: Stat uses metadata only

- **WHEN** `stat('energy-sources')` runs
- **THEN** it returns `{ fetchedAt, contentHash }` from object metadata and does not download the object body

#### Scenario: Missing object

- **GIVEN** no object exists for the key
- **WHEN** `stat` and `read` run
- **THEN** both resolve `undefined` without a warning

#### Scenario: Corrupt object

- **GIVEN** the object body is not valid snapshot JSON
- **WHEN** `read` runs
- **THEN** it resolves `undefined` and a warning is logged

#### Scenario: Tests need no GCP

- **WHEN** the API unit suite runs
- **THEN** the GCS client is stubbed or injected and no network or credentials are used

### Requirement: Persistence is configured by validated environment variables

The API SHALL validate `SNAPSHOT_BUCKET` (optional, empty allowed, a valid GCS bucket name) and `SNAPSHOT_PREFIX` (kebab-case, validated whenever it is set, and required when `SNAPSHOT_BUCKET` is non-empty) in the Joi schema and expose them through `AppConfigService.snapshotBucket` and `snapshotPrefix` (`string | undefined`). `SnapshotsModule` SHALL provide the GCS store when both are set and the disabled store otherwise, logging which one at boot. `.env.example` and the `README.md` environment table SHALL document both variables.

#### Scenario: Unset bucket disables persistence

- **GIVEN** `SNAPSHOT_BUCKET` unset or empty
- **WHEN** the application boots
- **THEN** validation passes, `SNAPSHOT_STORE` is the disabled store and the BFF behaves as before this change

#### Scenario: Bucket without prefix fails fast

- **GIVEN** `SNAPSHOT_BUCKET=my-bucket` and `SNAPSHOT_PREFIX` unset
- **WHEN** the configuration is validated
- **THEN** validation fails with a message naming `SNAPSHOT_PREFIX`

#### Scenario: Invalid values are rejected

- **GIVEN** `SNAPSHOT_BUCKET=Bad Bucket!` or `SNAPSHOT_PREFIX=Prod/Env`
- **WHEN** the configuration is validated
- **THEN** validation fails

#### Scenario: Both set enables the GCS store

- **GIVEN** `SNAPSHOT_BUCKET=my-bucket` and `SNAPSHOT_PREFIX=production`
- **WHEN** the module is built
- **THEN** `SNAPSHOT_STORE` is the GCS store for that bucket and prefix

#### Scenario: Docs list the variables

- **WHEN** `.env.example` and the `README.md` environment table are read
- **THEN** both describe `SNAPSHOT_BUCKET` and `SNAPSHOT_PREFIX`

### Requirement: The three OWID categories serve a stale snapshot when OWID fails

`co2-emissions`, `global-temperature` and `energy-sources` SHALL assemble their payload through `ProviderSnapshotService.resolve` keyed by the category slug. When it returns `stale: true` the endpoint SHALL respond `200` with the stored payload, `meta.stale: true` and `meta.fetchedAt` equal to the stored fetch time. When it returns `stale: false` the endpoint SHALL respond with `meta.stale: false` and `meta.fetchedAt` equal to the fetch time. `buildOwidEnvelope` SHALL take `fetchedAt` and `stale` and rebuild `meta.source` from the current publisher definition plus the payload's `lastUpdated`. `recordProviderUpdate` SHALL only be called for fresh results. With the disabled store the endpoints SHALL behave as before except for the added `meta.stale: false`.

#### Scenario: Provider down with a snapshot

- **GIVEN** the transport stub failing every request and a stub store holding a snapshot fetched 3 days ago
- **WHEN** `GET /api/v1/energy-sources` is called
- **THEN** the response is `200`, `success: true`, `meta.stale: true`, `meta.fetchedAt` is that snapshot's time and `data` equals the stored payload

#### Scenario: Provider down without a snapshot

- **GIVEN** the transport stub failing every request and an empty store
- **WHEN** each of the three endpoints is called
- **THEN** each responds `502` with the constant provider-error body

#### Scenario: Provider up

- **GIVEN** the transport stub serving the fixtures
- **WHEN** each endpoint is called
- **THEN** the response is `200` with `meta.stale: false` and `meta.fetchedAt` equal to the response time

#### Scenario: Persistence disabled

- **GIVEN** the disabled store and the provider down
- **WHEN** an endpoint is called
- **THEN** the response is `502`, as before this change

#### Scenario: Storage error does not break a good response

- **GIVEN** a store whose methods reject and the provider up
- **WHEN** an endpoint is called
- **THEN** the response is `200` with fresh data

#### Scenario: Provider catalog is untouched by stale responses

- **GIVEN** a stale response was served
- **WHEN** the data-sources catalog is read
- **THEN** its OWID `lastUpdated` was not advanced by the stale payload

### Requirement: Deploy wiring and the bucket runbook

`deploy-api.yml` SHALL read an optional repository variable `SNAPSHOT_BUCKET` (not part of the pre-flight required list) and, when it is non-empty, pass `SNAPSHOT_BUCKET=<value>` and `SNAPSHOT_PREFIX=<target>` (`production` or `development`) to the service, passing neither when it is empty. No secret or key SHALL be introduced. `docs/deploy/cloud-run.md` SHALL contain a one-time setup section with copy-paste Cloud Shell commands that: create the bucket in `us-central1` with Standard class, uniform bucket-level access, enforced public access prevention and soft delete disabled; grant `roles/storage.objectAdmin` on that bucket only to the Cloud Run runtime service account (reusing the runbook's runtime-SA discovery command); and set the `SNAPSHOT_BUCKET` repository variable. It SHALL also document the verification command `gcloud storage ls gs://<bucket>/development/`, the free-tier limits, the Cloud Shell commands that create a US$1 monthly budget for the project with alert thresholds at 10%, 50% and 100% (including enabling `billingbudgets.googleapis.com` and finding the billing account), a note that the alert only notifies, does not cap spending and lags by hours, where to see Cloud Storage usage (Billing reports and the bucket Observability tab), and the rollout order (setup, push to `develop`, verify the dev service, then the `develop` to `main` pull request).

#### Scenario: Variable unset

- **GIVEN** the `SNAPSHOT_BUCKET` repository variable unset
- **WHEN** the deploy workflow runs
- **THEN** the pre-flight check passes and no `SNAPSHOT_*` env var is passed

#### Scenario: Variable set

- **GIVEN** `SNAPSHOT_BUCKET=my-bucket`
- **WHEN** the workflow deploys target `development`
- **THEN** the service receives `SNAPSHOT_BUCKET=my-bucket` and `SNAPSHOT_PREFIX=development`, and for `production` the prefix is `production`

#### Scenario: Runbook is runnable

- **WHEN** the new runbook section is read
- **THEN** it contains the bucket creation, IAM binding, budget, variable and verification commands with every flag named above, and states that the setup precedes the first push to `develop`

#### Scenario: Unsetting the variable

- **WHEN** the runbook troubleshooting is read
- **THEN** it explains that unsetting the variable does not remove the env vars already deployed and gives the `--remove-env-vars` command

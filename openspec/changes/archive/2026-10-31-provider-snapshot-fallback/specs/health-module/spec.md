## ADDED Requirements

### Requirement: Liveness is independent of snapshot persistence

`GET /api/v1/health` SHALL NOT call the snapshot store or the Cloud Storage client, and `HealthController` SHALL NOT inject `ProviderSnapshotService` or the `SNAPSHOT_STORE` token. A missing bucket, missing IAM permission or a Cloud Storage outage SHALL NOT change the liveness response or delay the startup probe.

#### Scenario: Liveness with a failing store

- **GIVEN** the application built with a snapshot store whose methods all reject
- **WHEN** `GET /api/v1/health` is called
- **THEN** the response is `200` with `{ "status": "ok" }` and no store method was called

#### Scenario: Controller dependencies

- **WHEN** the constructor parameters of `HealthController` are inspected
- **THEN** none is `ProviderSnapshotService` or `SNAPSHOT_STORE`

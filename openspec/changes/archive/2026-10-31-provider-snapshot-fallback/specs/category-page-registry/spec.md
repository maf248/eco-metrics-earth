## ADDED Requirements

### Requirement: The recipe documents the snapshot fallback for provider-backed categories

`AGENTS.md` SHALL state, in "Adding an OWID-backed category (end to end)", that a provider-backed category assembles its payload through `ProviderSnapshotService.resolve` (serving `meta.stale` and `meta.fetchedAt`), passes `fetchedAt` and `stale` to `buildOwidEnvelope`, and registers its web page with `defineProviderCategoryPage` (provider name, optional freshness override); it SHALL list `common/snapshots/` and the new web pieces in the structure tree and mention `SNAPSHOT_BUCKET` and `SNAPSHOT_PREFIX`. The resilience item SHALL be removed from `ROADMAP.md` and the remaining IDs renumbered without gaps.

#### Scenario: AGENTS.md carries the fallback steps

- **WHEN** `AGENTS.md` is read
- **THEN** the OWID-backed category recipe names `ProviderSnapshotService.resolve`, `defineProviderCategoryPage` and the stale/unavailable behavior, and the structure tree lists `common/snapshots/`

#### Scenario: Roadmap is continuous

- **WHEN** `ROADMAP.md` is read
- **THEN** it has no block for the closed resilience item and no gap in the remaining `Pxx`/`Dxx`/`Ixx` sequences, with every cross-reference updated

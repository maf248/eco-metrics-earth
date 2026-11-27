## ADDED Requirements

### Requirement: Sectioned provider-backed pages keep each provider's state independent

`categoryPages.tsx` SHALL export `defineSectionedProviderCategoryPage` taking `{ sections, Content }`, each section `{ provider: { name, freshness? }, load }`, so a provider outage affects only its own section.

#### Scenario: One section unavailable

- **GIVEN** five sections where one `load` resolves `provider-unavailable`
- **WHEN** the definition's `load` runs
- **THEN** it returns four `fresh` states and one `unavailable` state without a payload, and does not throw

#### Scenario: Per-section freshness

- **GIVEN** two stale payloads of the same age, one section with a `{ silentDays: 2, noticeDays: 30 }` override and one with the default
- **WHEN** the definition's `load` runs
- **THEN** the first resolves `stale-notice` and the second `fresh`

#### Scenario: Degraded page leaves the 24 h cache

- **GIVEN** a state map with an `unavailable` section without a payload
- **WHEN** `isDegraded` is evaluated
- **THEN** it is true; with every section fresh or stale it is false

#### Scenario: Our own BFF failing still throws

- **GIVEN** one section's `load` rejecting
- **WHEN** the definition's `load` runs
- **THEN** the rejection propagates

#### Scenario: Sections load concurrently

- **WHEN** the definition's `load` runs
- **THEN** every section's `load` starts before any resolves, and the result maps each section key to a `ProviderPageState` that `Content` renders through `ProviderBackedContent`

#### Scenario: Shared state resolution

- **WHEN** `resolveProviderPageState(result, provider)` is imported
- **THEN** both `defineProviderCategoryPage` and the sectioned helper use it

#### Scenario: Single-provider helper is unchanged

- **WHEN** the existing `defineProviderCategoryPage` tests run unmodified
- **THEN** they pass

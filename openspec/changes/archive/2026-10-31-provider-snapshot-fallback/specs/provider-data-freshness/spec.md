## ADDED Requirements

### Requirement: Freshness is evaluated from the response meta with configurable thresholds

The web SHALL provide a pure function `evaluateFreshness(meta, now, thresholds)` in `apps/web/src/lib/providerFreshness.ts` and a `DEFAULT_FRESHNESS_THRESHOLDS` constant of `{ silentDays: 7, noticeDays: 30 }`. A `meta` whose `stale` is absent or `false` SHALL evaluate to `fresh` regardless of `fetchedAt`. With `stale: true`, an age up to and including `silentDays` SHALL evaluate to `fresh`, an age above `silentDays` and up to and including `noticeDays` to `stale-notice` (carrying `fetchedAt`), and anything older, or an unparseable `fetchedAt`, to `unavailable`. A `fetchedAt` in the future SHALL count as age 0. Thresholds SHALL satisfy `0 <= silentDays < noticeDays`, otherwise the function SHALL throw.

#### Scenario: Not stale

- **GIVEN** `meta.stale` is `false` and `fetchedAt` is 30 days old
- **WHEN** freshness is evaluated
- **THEN** the result is `fresh`

#### Scenario: Legacy meta without the flag

- **GIVEN** a `meta` without `stale`
- **WHEN** freshness is evaluated
- **THEN** the result is `fresh`

#### Scenario: Stale within seven days

- **GIVEN** `stale: true` and a `fetchedAt` exactly 7 days old
- **WHEN** freshness is evaluated with the defaults
- **THEN** the result is `fresh`

#### Scenario: Stale between seven and thirty days

- **GIVEN** `stale: true` and a `fetchedAt` 7 days and 1 minute old, and another exactly 30 days old
- **WHEN** freshness is evaluated with the defaults
- **THEN** both are `stale-notice` carrying their `fetchedAt`

#### Scenario: Stale beyond thirty days

- **GIVEN** `stale: true` and a `fetchedAt` 30 days and 1 minute old
- **WHEN** freshness is evaluated with the defaults
- **THEN** the result is `unavailable` carrying that `fetchedAt`

#### Scenario: Unparseable or future timestamps

- **GIVEN** `stale: true` with `fetchedAt: 'not-a-date'`, and another with a `fetchedAt` one hour in the future
- **WHEN** freshness is evaluated
- **THEN** the first is `unavailable` without a date and the second is `fresh`

#### Scenario: Per-category override

- **GIVEN** thresholds `{ silentDays: 1, noticeDays: 3 }` and `stale: true` with a 2-day-old `fetchedAt`
- **WHEN** freshness is evaluated
- **THEN** the result is `stale-notice`

#### Scenario: Invalid thresholds

- **WHEN** thresholds with `silentDays >= noticeDays` or a negative value are passed
- **THEN** the function throws

### Requirement: A provider 502 is distinguished from other BFF failures

`apps/web/src/lib/bffFetch.ts` SHALL export `fetchProviderPayloadFromBff`, built on the same attempt loop as `fetchPayloadFromBff` (2 attempts of 10 s, shape guard, Data Cache bypass after a shape mismatch, mandatory `meta`), returning `{ kind: 'ok', payload }` or `{ kind: 'provider-unavailable' }`. It SHALL return `provider-unavailable` only when the final attempt received HTTP `502` with a JSON body `{ success: false, status: 502 }`, logging one error. Every other failure (timeout, network error, other non-2xx status, a non-JSON `502`, a shape mismatch) SHALL throw `Error('<label> could not be fetched from the BFF')` as today. When the first attempt is a provider `502`, the second attempt SHALL be requested with `next: { revalidate: 300 }` instead of 86400. `isMeta` SHALL accept an optional boolean `stale` and reject a non-boolean one.

#### Scenario: Provider 502 on both attempts

- **GIVEN** the BFF answers `502` with `{ success: false, error, status: 502 }` to both attempts
- **WHEN** `fetchProviderPayloadFromBff` runs
- **THEN** exactly 2 requests are made, one error is logged and `{ kind: 'provider-unavailable' }` is returned

#### Scenario: Degraded retry uses a short revalidation

- **GIVEN** the first attempt is a provider `502`
- **WHEN** the second attempt is issued
- **THEN** its fetch options carry `next: { revalidate: 300 }` and the first carried `next: { revalidate: 86400 }`

#### Scenario: Provider 502 then success

- **GIVEN** the first attempt is a provider `502` and the second succeeds
- **WHEN** the helper runs
- **THEN** it returns `{ kind: 'ok', payload }`

#### Scenario: Infrastructure failures still throw

- **GIVEN** the BFF is unreachable, answers `503`, or answers `502` with an HTML body, on both attempts
- **WHEN** the helper runs
- **THEN** it throws `Error('<label> could not be fetched from the BFF')`

#### Scenario: Stale meta is accepted

- **GIVEN** a `200` with `meta.stale: true` and a valid payload
- **WHEN** the helper runs
- **THEN** it returns `{ kind: 'ok' }` with `payload.meta.stale === true`

#### Scenario: Malformed stale flag

- **GIVEN** a `200` whose `meta.stale` is the string `"yes"`
- **WHEN** the helper runs
- **THEN** the attempt counts as a shape mismatch and the helper throws after the retry

### Requirement: A stale notice shows data older than seven days

A `StaleDataNotice` component SHALL render a banner above the section content with the exact text "{Provider name} is currently unreachable. Showing the copy we retrieved on {date}.", where `{date}` is `formatUtcDate(fetchedAt)` inside a `<time dateTime>` and `{Provider name}` is `meta.source.provider`. It SHALL carry `role="status"` and a `data-testid`, use only the warning tokens, include a decorative icon (`aria-hidden`), and contain no interactive control.

#### Scenario: Banner copy

- **GIVEN** `fetchedAt` `2026-10-20T10:00:00Z` and provider `Our World in Data`
- **WHEN** the notice renders
- **THEN** it reads "Our World in Data is currently unreachable. Showing the copy we retrieved on Oct 20, 2026."

#### Scenario: Semantics

- **WHEN** the notice renders
- **THEN** it has `role="status"`, contains a `<time>` with the ISO date and no button or link

#### Scenario: Tokens only

- **WHEN** `designTokens.test.ts` scans the component
- **THEN** it finds no palette or arbitrary color utility

### Requirement: An unavailable state replaces the section content

A `DataUnavailable` component SHALL render, with `role="status"` (not `alert`), a neutral warning icon (`aria-hidden`, colored with `warning-fg`, not an error red), an `<h2>` "Data temporarily unavailable", the body "We couldn't reach {Provider name} to load this data. We're keeping an eye on it and it should be back soon." and, only when a snapshot date is known, the line "Last retrieved from {Provider name}: {date}". It SHALL NOT render a retry button or any interactive control.

#### Scenario: Without a date

- **GIVEN** no snapshot date
- **WHEN** the component renders for `Our World in Data`
- **THEN** it shows the title and body and no "Last retrieved from" line

#### Scenario: With a date

- **GIVEN** a snapshot date `2026-10-01T00:00:00Z`
- **WHEN** the component renders
- **THEN** it also shows "Last retrieved from Our World in Data: Oct 1, 2026"

#### Scenario: Semantics

- **WHEN** the component renders
- **THEN** it has `role="status"`, no `role="alert"`, an `<h2>`, and no `button`

### Requirement: Provider-backed categories compose freshness, notice and unavailable state

`categoryPages.tsx` SHALL export `defineProviderCategoryPage` taking `{ provider: { name, freshness? }, load, Content }` where `load` uses `fetchProviderPayloadFromBff`. It SHALL return a regular registry definition whose `load` evaluates freshness once with the category's thresholds (global default plus optional per-category override) and whose `Content` is a generic `ProviderBackedContent`. `ProviderBackedContent` SHALL render: for `fresh`, the category `Content` only; for `stale-notice`, `StaleDataNotice` above the category `Content`; for `unavailable` or a provider `502`, `DataUnavailable` in place of the category `Content`, together with `DataAttribution` when `meta` is known. The provider name SHALL be `meta.source.provider` when `meta` exists and the registry entry's `provider.name` otherwise. The common header (icon and `<h1>`) SHALL always remain, `[category]/page.tsx` SHALL NOT change, and `co2-emissions`, `global-temperature` and `energy-sources` SHALL be registered through it; `water-footprint` SHALL NOT.

#### Scenario: Fresh data

- **GIVEN** a payload with `stale: false`
- **WHEN** the page renders the category
- **THEN** the category content is shown with no notice and no unavailable state

#### Scenario: Stale between seven and thirty days

- **GIVEN** a payload with `stale: true` and `fetchedAt` 14 days old
- **WHEN** the page renders
- **THEN** the notice is shown above the full category content

#### Scenario: Stale beyond thirty days

- **GIVEN** a payload with `stale: true` and `fetchedAt` 40 days old
- **WHEN** the page renders
- **THEN** the unavailable state replaces the content, "Last retrieved from" shows the date, the source attribution is visible, and the header is still rendered

#### Scenario: Provider 502 without a snapshot

- **GIVEN** `load` resolves `provider-unavailable`
- **WHEN** the page renders
- **THEN** the unavailable state shows the registry's provider name with no date, the header is still rendered, and the page does not throw

#### Scenario: Our own BFF failing still throws

- **GIVEN** the BFF is unreachable
- **WHEN** the page renders
- **THEN** the rejection propagates exactly as before

#### Scenario: Per-category override

- **GIVEN** a registry entry with `freshness: { silentDays: 1, noticeDays: 3 }` and a 2-day-old stale payload
- **WHEN** the page renders
- **THEN** the notice is shown

#### Scenario: Registration

- **WHEN** `CATEGORY_PAGES` is inspected
- **THEN** the three OWID entries declare a provider and `water-footprint` does not

#### Scenario: Build independence

- **WHEN** `next build` runs with the BFF unreachable
- **THEN** it succeeds, because provider-backed categories are not pre-rendered

### Requirement: Healthy providers show no degraded UI end to end

The E2E specs of the three OWID categories SHALL assert, against the fixture-backed BFF (no bucket, so `stale: false`), that neither the stale notice nor the unavailable state is rendered.

#### Scenario: Healthy page

- **GIVEN** the fixture servers running
- **WHEN** each OWID category page loads
- **THEN** the stale notice and the unavailable state are absent and the charts are visible

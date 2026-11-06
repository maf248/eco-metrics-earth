## MODIFIED Requirements

### Requirement: Next.js server sends the internal API key on BFF fetches

A server-only helper (`apps/web/src/lib/internalApiHeaders.ts`) SHALL return request headers for calls from the Next.js server to the API. It SHALL read `process.env.INTERNAL_API_KEY` and, when it is a non-empty trimmed string, return `{ 'X-Internal-Api-Key': <value> }`; otherwise it SHALL return an empty object (local development only; the production API answers `401` without the key). The module SHALL `import 'server-only'` so that importing it from a Client Component fails the build. The variable SHALL NEVER be prefixed `NEXT_PUBLIC_`. The generic BFF fetch helper `fetchFromBff` (and therefore `getWaterFootprintProducts()` and `getDataSources()`, which are built on it) SHALL include these headers on every `fetch` attempt. The key SHALL NOT be logged.

#### Scenario: Header sent when configured

- **GIVEN** `INTERNAL_API_KEY` set to a non-empty value
- **WHEN** `getWaterFootprintProducts()` or `getDataSources()` calls `fetch`
- **THEN** the request init includes `headers` with `X-Internal-Api-Key` equal to the value
- **AND** the `next: { revalidate: 86400 }` option and a per-attempt `AbortSignal` timeout of 10 s are present

#### Scenario: No header when not configured

- **GIVEN** `INTERNAL_API_KEY` unset or whitespace-only
- **WHEN** `getWaterFootprintProducts()` or `getDataSources()` calls `fetch`
- **THEN** no `X-Internal-Api-Key` header is sent and behavior is otherwise unchanged

#### Scenario: Key cannot reach client bundles

- **WHEN** `INTERNAL_API_KEY` is declared in `apps/web/.env.example`
- **THEN** it is documented as server-only (no `NEXT_PUBLIC_` prefix) and the helper imports `server-only`
- **AND** the production build's client bundles do not contain the key value (verified by building with a sentinel value and grepping `.next/static`)

#### Scenario: Unit tests run under Jest

- **WHEN** the web Jest suite imports the helper
- **THEN** `server-only` is mapped to an empty stub in `jest.config.cjs` so the import does not throw, with zero warnings

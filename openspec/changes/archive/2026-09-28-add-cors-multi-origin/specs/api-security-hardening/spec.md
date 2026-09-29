## MODIFIED Requirements

### Requirement: CORS_ORIGIN is validated at startup via Joi schema

The API SHALL validate the `CORS_ORIGIN` environment variable through the AppModule Joi schema as a **comma-separated list of exact origins**. Every entry (after trimming surrounding whitespace) MUST be a valid URI. The schema MUST reject entries that are not URIs, entries containing `*` (wildcards — with an error pointing the operator to `CORS_ORIGIN_PATTERN` for pattern-based origins), and empty entries (leading/trailing/doubled commas, or a wholly empty value). A single origin remains a valid one-entry list (backward compatible). If `CORS_ORIGIN` is absent from the environment, the schema SHALL default to `'http://localhost:3000'`.

#### Scenario: API starts with valid CORS_ORIGIN

- **WHEN** `CORS_ORIGIN` is set to a single valid URI (e.g., `https://eco-metrics.earth`)
- **THEN** the API starts successfully and allows exactly that origin (a single origin is a valid one-entry list — backward compatible)

#### Scenario: API starts with a comma-separated list of valid origins

- **WHEN** `CORS_ORIGIN` is set to `http://localhost:3000,https://eco-metrics.earth`
- **THEN** the API starts successfully and allows both origins (whitespace around commas is tolerated)

#### Scenario: API fails fast with invalid CORS_ORIGIN

- **WHEN** `CORS_ORIGIN` is set to a value with any entry that is not a URI (e.g., `http://localhost:3000,not-a-url`)
- **THEN** the API process throws a validation error at startup and does not start

#### Scenario: API fails fast on wildcard entries

- **WHEN** `CORS_ORIGIN` is set to `https://*.vercel.app`
- **THEN** the API process throws a validation error at startup whose message points the operator to `CORS_ORIGIN_PATTERN` for pattern-based origins

#### Scenario: API fails fast on empty entries

- **WHEN** `CORS_ORIGIN` is set to a value with a trailing comma, doubled commas, or an empty string
- **THEN** the API process throws a validation error at startup and does not start

#### Scenario: API uses default when CORS_ORIGIN is absent

- **WHEN** `CORS_ORIGIN` is not set in the environment
- **THEN** the API starts and allows `http://localhost:3000` (a one-entry list)

### Requirement: CORS_ORIGIN is read from AppConfigService

The `main.ts` bootstrap function SHALL read the allowed CORS origins from `AppConfigService` — a getter returning the parsed `CORS_ORIGIN` entries as strings plus the compiled `CORS_ORIGIN_PATTERN` as a `RegExp` when one is set — instead of accessing `process.env` directly, and SHALL pass that array to `enableCors({ origin })`.

#### Scenario: Bootstrap reads validated CORS origin

- **GIVEN** `CORS_ORIGIN` set to `http://localhost:3000,https://eco-metrics.earth` and no pattern
- **WHEN** the NestJS app bootstraps
- **THEN** `enableCors` is called with `origin` set to the array `['http://localhost:3000', 'https://eco-metrics.earth']`

#### Scenario: Bootstrap includes the compiled pattern in the origins array

- **GIVEN** `CORS_ORIGIN_PATTERN` set to `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`
- **WHEN** the NestJS app bootstraps
- **THEN** `enableCors` is called with an `origin` array that also contains a `RegExp` matching that pattern

## ADDED Requirements

### Requirement: CORS_ORIGIN_PATTERN is validated at startup and compiled to an anchored RegExp

The API SHALL support an optional `CORS_ORIGIN_PATTERN` environment variable: a single regular expression matched against the request `Origin` header, for origin families that cannot be enumerated exactly (e.g., Vercel preview URLs of the form `https://<project>-<hash>-<scope>.vercel.app`). When set to a non-empty value, it MUST be anchored (begin with `^` and end with `$`) and MUST compile as a JavaScript `RegExp`; the Joi schema SHALL reject unanchored or non-compiling values at startup. When absent or empty, no pattern applies (exact origins only).

#### Scenario: API starts with an anchored, compiling pattern

- **WHEN** `CORS_ORIGIN_PATTERN` is set to `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`
- **THEN** the API starts successfully and origins matching the pattern are allowed

#### Scenario: API fails fast with an unanchored pattern

- **WHEN** `CORS_ORIGIN_PATTERN` is set to `https://.*\.vercel\.app` (no `^`/`$` anchors)
- **THEN** the API process throws a validation error at startup demanding explicit `^`...`$` anchors and does not start

#### Scenario: API fails fast with a non-compiling pattern

- **WHEN** `CORS_ORIGIN_PATTERN` is set to `^https://([unbalanced\.vercel\.app$`
- **THEN** the API process throws a validation error at startup and does not start

#### Scenario: Absent or empty pattern means exact origins only

- **WHEN** `CORS_ORIGIN_PATTERN` is not set or is set to an empty string
- **THEN** the API starts and only the `CORS_ORIGIN` exact origins are allowed

### Requirement: CORS reflects matched origins and omits the header for unknown origins

With the allowed origins configured as an array (exact strings plus the optional pattern), the API SHALL emit `Access-Control-Allow-Origin` on a response only when the request carries an `Origin` header that matches an exact origin or the pattern — reflecting the request's own origin in the header value. Requests without an `Origin` header, or with an origin that matches nothing, SHALL receive no `Access-Control-Allow-Origin` header; the browser's same-origin policy then blocks any cross-origin read. This replaces the previous fixed-string behavior in which the header was emitted unconditionally on every response.

#### Scenario: Request with an Origin matching an exact entry

- **GIVEN** `CORS_ORIGIN` set to `http://localhost:3000,https://eco-metrics.earth`
- **WHEN** a request with `Origin: https://eco-metrics.earth` hits any API route
- **THEN** the response includes `Access-Control-Allow-Origin: https://eco-metrics.earth`

#### Scenario: Request with an Origin matching the pattern (Vercel preview URL)

- **GIVEN** `CORS_ORIGIN_PATTERN` set to `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`
- **WHEN** a request with `Origin: https://eco-metrics-earth-abc123-some-scope.vercel.app` hits any API route
- **THEN** the response includes `Access-Control-Allow-Origin` reflecting that preview origin

#### Scenario: Request with an unknown Origin gets no CORS header

- **GIVEN** any allowed-origins configuration
- **WHEN** a request with `Origin: https://evil.example` hits any API route
- **THEN** the response includes no `Access-Control-Allow-Origin` header

#### Scenario: Request without an Origin header gets no CORS header

- **GIVEN** any allowed-origins configuration
- **WHEN** a request without an `Origin` header (e.g., curl, infrastructure health probes) hits any API route
- **THEN** the response includes no `Access-Control-Allow-Origin` header

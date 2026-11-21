## MODIFIED Requirements

### Requirement: Generic BFF fetch helper

The web app SHALL provide `fetchFromBff<T>({ path, label, isData })` in `apps/web/src/lib/bffFetch.ts`, the single implementation of server-side BFF reads. It SHALL request `${apiBaseUrl()}${path}` with the headers from `internalApiHeaders()` plus a fresh W3C `traceparent` header per attempt (`00-<32 hex trace id>-<16 hex span id>-00`, unsampled), `next: { revalidate: 86400 }` and a fresh `AbortSignal.timeout(10000)` per attempt; make at most 2 attempts with no delay; treat a network error, timeout, non-2xx status, malformed JSON, a payload that is not `{ success: true, data }`, or a `data` value rejected by the `isData` guard as a failed attempt; resolve with the validated `data`; and, when every attempt fails, log exactly one `console.error` that includes the trace id of every attempt (never the headers or the API key) and throw `Error(`${label} could not be fetched from the BFF`, { cause: lastError })`. The module SHALL be server-only. The correlation header SHALL be `traceparent` and not a custom header such as `X-Request-ID`, because Next.js includes request headers in the fetch Data Cache key except `traceparent` and `tracestate`: a per-attempt random custom header would make every read a cache miss and defeat `revalidate: 86400`. The API uses the trace id as the request id when no `X-Request-ID` is sent, so the logged trace id is the `requestId` of the API log lines.

#### Scenario: Success on the first attempt

- **GIVEN** the BFF responds `{ success: true, data: D }` and `isData(D)` is true
- **WHEN** `fetchFromBff` runs
- **THEN** it resolves with `D` after exactly one request and logs nothing

#### Scenario: Cold start recovered by the retry

- **GIVEN** the first attempt times out and the second succeeds
- **WHEN** `fetchFromBff` runs
- **THEN** it resolves after two requests, each with its own timeout signal, and logs nothing

#### Scenario: Every failure mode counts as a failed attempt

- **GIVEN** both attempts fail by network error, HTTP 500, invalid JSON, `{ success: false }`, or `data` rejected by `isData`
- **WHEN** `fetchFromBff` runs
- **THEN** exactly 2 requests are made, one `console.error` is logged, and `Error('<label> could not be fetched from the BFF')` is thrown with the last failure as `cause`

#### Scenario: Request options

- **WHEN** `fetchFromBff` issues a request with `INTERNAL_API_KEY` set
- **THEN** the init includes `X-Internal-Api-Key`, `next: { revalidate: 86400 }` and an `AbortSignal`
- **AND** with the key unset no `X-Internal-Api-Key` header is sent

#### Scenario: A fresh traceparent is sent per attempt

- **WHEN** `fetchFromBff` issues its attempts
- **THEN** each request has a `traceparent` header matching `^00-[0-9a-f]{32}-[0-9a-f]{16}-00$` with a non-zero trace id
- **AND** the two attempts of one read have different trace ids
- **AND** no `X-Request-ID` header is sent

#### Scenario: The failure log carries the trace ids

- **GIVEN** both attempts failing
- **WHEN** the logged arguments are inspected
- **THEN** they contain the trace id of each attempt (the 32 hex characters of its `traceparent`)

#### Scenario: The key is never logged

- **GIVEN** `INTERNAL_API_KEY` set and both attempts failing
- **WHEN** the logged arguments are inspected
- **THEN** they do not contain the key value

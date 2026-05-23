# E2E API Health Tests

## ADDED Requirements

### Requirement: Health endpoint returns 200 with status ok
The API health endpoint `GET /api/v1/health` SHALL return HTTP 200 with a JSON body `{ "status": "ok" }`.

#### Scenario: Health check returns success
- **WHEN** the browser fetches `http://localhost:3001/api/v1/health`
- **THEN** the response status is 200
- **AND** the response body is JSON
- **AND** `response.status` equals "ok"

### Requirement: Unknown API route returns 404
Any `GET` request to a non-existent API route SHALL return HTTP 404 with a JSON error body.

#### Scenario: Nonexistent route returns 404
- **WHEN** the browser fetches `http://localhost:3001/api/v1/nonexistent`
- **THEN** the response status is 404
- **AND** the response body is JSON

### Requirement: API responses include CORS headers
API responses SHALL include `Access-Control-Allow-Origin` header matching the configured `CORS_ORIGIN` (default: `http://localhost:3000`).

#### Scenario: Health endpoint includes CORS header
- **WHEN** the browser fetches `http://localhost:3001/api/v1/health`
- **THEN** the response includes `Access-Control-Allow-Origin` header
- **AND** the header value is `http://localhost:3000`

#### Scenario: Error responses include CORS header
- **WHEN** the browser fetches `http://localhost:3001/api/v1/nonexistent`
- **THEN** the response includes `Access-Control-Allow-Origin` header

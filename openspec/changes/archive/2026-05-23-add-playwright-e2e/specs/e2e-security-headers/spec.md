# E2E Security Headers Tests

## ADDED Requirements

### Requirement: Web app returns security headers
All HTML page responses from `apps/web` SHALL include the following security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (with camera, microphone, geolocation restricted)
- `Content-Security-Policy` (non-empty)

#### Scenario: Home page has all security headers
- **WHEN** the browser loads the home page
- **THEN** the response includes `X-Frame-Options: DENY`
- **AND** the response includes `X-Content-Type-Options: nosniff`
- **AND** the response includes `Referrer-Policy: strict-origin-when-cross-origin`
- **AND** the response includes a non-empty `Permissions-Policy` header
- **AND** the response includes a non-empty `Content-Security-Policy` header

#### Scenario: Category pages have security headers
- **WHEN** the browser loads `/air-quality/`
- **THEN** the response includes `X-Frame-Options: DENY`
- **AND** the response includes `X-Content-Type-Options: nosniff`
- **AND** the response includes `Content-Security-Policy` header

#### Scenario: 404 page has security headers
- **WHEN** the browser loads a non-existent page
- **THEN** the response includes `X-Frame-Options: DENY`

### Requirement: CSP does not allow framing
The `Content-Security-Policy` header SHALL include `frame-ancestors 'none'` to prevent clickjacking.

#### Scenario: CSP includes frame-ancestors
- **WHEN** the browser loads any page
- **THEN** the `Content-Security-Policy` header value contains `frame-ancestors 'none'`

### Requirement: Permissions-Policy restricts sensitive features
The `Permissions-Policy` header SHALL restrict `camera`, `microphone`, and `geolocation` to empty allowlists.

#### Scenario: Permissions-Policy restricts camera and microphone
- **WHEN** the browser loads any page
- **THEN** the `Permissions-Policy` header value contains `camera=()`
- **AND** the header value contains `microphone=()`
- **AND** the header value contains `geolocation=()`

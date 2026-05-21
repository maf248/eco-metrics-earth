## ADDED Requirements

### Requirement: GetMetricsQueryDto validates optional query parameters
The system SHALL provide a DTO for metric query parameters that validates optional date ranges and category filters. This DTO is explicitly temporary (mock/demo) and will be replaced when real eco-category modules are implemented.

#### Scenario: Valid query with optional filters
- **WHEN** a client sends a GET request with valid `fromDate`, `toDate`, and `category` query parameters
- **THEN** the API accepts the request and the controller receives a transformed `GetMetricsQueryDto` instance

#### Scenario: Invalid date format in fromDate
- **WHEN** a client sends a GET request with `fromDate="not-a-date"`
- **THEN** the API responds with HTTP `400 Bad Request` indicating `fromDate` is invalid

#### Scenario: Non-whitelisted query parameter
- **WHEN** a client sends a GET request with an extra query parameter not defined in the DTO
- **THEN** the API responds with HTTP `400 Bad Request` indicating the unexpected property

### Requirement: CreateMetricDto validates body payloads
The system SHALL provide a DTO for creating a metric entry that validates required fields (name, value, unit) and their types. This DTO is explicitly temporary (mock/demo) and will be replaced when real eco-category modules are implemented.

#### Scenario: Valid metric payload
- **WHEN** a client sends a POST request with a body containing `name`, `value`, and `unit`
- **THEN** the API accepts the request and the controller receives a transformed `CreateMetricDto` instance

#### Scenario: Missing required fields
- **WHEN** a client sends a POST request missing `value` or `unit`
- **THEN** the API responds with HTTP `400 Bad Request` listing the missing required fields

#### Scenario: Wrong type for value
- **WHEN** a client sends a POST request with `value="not-a-number"`
- **THEN** the API responds with HTTP `400 Bad Request` indicating `value` must be a number

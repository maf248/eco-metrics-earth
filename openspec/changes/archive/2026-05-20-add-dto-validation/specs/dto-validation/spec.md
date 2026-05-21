## ADDED Requirements

### Requirement: Global ValidationPipe is registered on application bootstrap
The API SHALL register a NestJS `ValidationPipe` globally so that every incoming request is validated, transformed, and stripped before reaching any controller.

#### Scenario: Bootstrap completes successfully
- **WHEN** the application starts
- **THEN** the global `ValidationPipe` is active for all routes under `/api/v1`

### Requirement: ValidationPipe rejects payloads with unexpected fields
The system SHALL reject any request body or query that contains fields not explicitly declared in the target DTO when `forbidNonWhitelisted` is enabled.

#### Scenario: Request body contains an extra field
- **WHEN** a client sends a POST request with a body containing an undeclared field
- **THEN** the API responds with HTTP `400 Bad Request` and an error message referencing the unexpected property

### Requirement: ValidationPipe strips undeclared fields when whitelisting is enabled
The system SHALL remove any fields from the payload that are not decorated with class-validator decorators in the DTO before passing the object to the controller.

#### Scenario: Request body has both valid and extra fields
- **WHEN** a client sends a request with declared and undeclared fields
- **THEN** the undeclared fields are stripped and the request proceeds if the remaining fields are valid
- **AND** if `forbidNonWhitelisted` is true the request is rejected instead

### Requirement: Invalid payloads are rejected with detailed errors
The system SHALL respond with HTTP `400 Bad Request` whenever a payload fails class-validator rules, and the response SHALL include an array of field-level error messages.

#### Scenario: Numeric field receives a string
- **WHEN** a client sends a value that fails `@IsNumber()` validation
- **THEN** the API responds with HTTP `400 Bad Request` and an error object listing the invalid field

#### Scenario: Required string field is missing
- **WHEN** a client sends a body missing a field marked with `@IsNotEmpty()`
- **THEN** the API responds with HTTP `400 Bad Request` indicating the missing field

### Requirement: Valid payloads are automatically transformed
The system SHALL use `class-transformer` to automatically convert primitive types (e.g., query string numbers to actual numbers) before validation runs.

#### Scenario: Query parameter string is transformed to number
- **WHEN** a query parameter `"42"` is sent to a DTO field decorated with `@IsNumber()` and `@Type(() => Number)`
- **THEN** the value is transformed to the number `42` and validation passes
- **AND** the controller receives the correctly typed value

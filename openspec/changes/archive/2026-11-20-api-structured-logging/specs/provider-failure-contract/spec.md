## MODIFIED Requirements

### Requirement: The global filter maps provider errors to 502

`AllExceptionsFilter` SHALL respond to any `ProviderError` with HTTP `502` and the body `{ success: false, error: 'Data provider unavailable or returned invalid data', status: 502 }`, the `ApiResponse` error format. The body SHALL be a constant string and SHALL NOT include the provider URL, the underlying message or a stack. The filter SHALL log the error class, its message and its `cause` chain at `error` level as one structured entry whose `message` is the error's stack (or `Name: message` when there is none), so each failure appears once and Google Cloud Error Reporting can group it. Errors that are neither `HttpException` nor `ProviderError` SHALL keep responding `500` with `Internal server error`, and `HttpException` handling SHALL be unchanged.

#### Scenario: Transport error becomes 502

- **GIVEN** a controller that throws `OutboundHttpStatusError` for a 503 from the provider
- **WHEN** it is called through the global pipeline
- **THEN** the response is `502` with `{ success: false, error: 'Data provider unavailable or returned invalid data', status: 502 }`

#### Scenario: Invalid provider data becomes 502

- **GIVEN** a controller that throws `OwidParseError` or `ProviderDataError`
- **WHEN** it is called
- **THEN** the response is `502` with the same body

#### Scenario: Internals are not leaked

- **GIVEN** a provider error whose message contains the provider URL
- **WHEN** the filter responds
- **THEN** the response body does not contain the URL or the message

#### Scenario: The failure is logged

- **WHEN** the filter handles a provider error
- **THEN** exactly one log entry at `error` level includes the error name, message, the `cause` chain, and a `message` containing the stack

#### Scenario: Unexpected errors stay 500

- **GIVEN** a controller that throws a plain `Error`
- **WHEN** it is called
- **THEN** the response is `500` with `Internal server error`

#### Scenario: HttpException handling is unchanged

- **GIVEN** a controller that throws `BadRequestException`
- **WHEN** it is called
- **THEN** the response is `400` as before

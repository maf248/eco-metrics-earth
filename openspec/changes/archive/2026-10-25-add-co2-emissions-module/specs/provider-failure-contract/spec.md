## ADDED Requirements

### Requirement: Provider errors share a base class

The API SHALL define `ProviderError` (extends `Error`, accepting `{ cause }`) and `ProviderDataError` (extends `ProviderError`) in `apps/api/src/common/errors/provider-error.ts`. `OutboundHttpError` (and therefore `OutboundTimeoutError`, `OutboundNetworkError` and `OutboundHttpStatusError`) and `OwidClientError` (and therefore `OwidInvalidParameterError`, `OwidParseError` and `OwidUnsupportedChartError`) SHALL extend `ProviderError` with their constructors, names, messages and `cause` handling otherwise unchanged. `common/` SHALL NOT import from `modules/`.

#### Scenario: Existing errors are provider errors

- **WHEN** an `OutboundHttpStatusError`, an `OwidParseError` and an `OwidInvalidParameterError` are constructed
- **THEN** each is an `instanceof ProviderError`

#### Scenario: Existing behavior is preserved

- **WHEN** the existing `common/http` and `providers/owid` suites run unmodified
- **THEN** they pass, including the assertions on messages, names, `url`, `status` and `cause`

#### Scenario: Data error carries a cause

- **WHEN** a `ProviderDataError` is constructed with a message and a `cause`
- **THEN** both are preserved and it is an `instanceof ProviderError`

### Requirement: The global filter maps provider errors to 502

`AllExceptionsFilter` SHALL respond to any `ProviderError` with HTTP `502` and the body `{ success: false, error: 'Data provider unavailable or returned invalid data', status: 502 }`, the `ApiResponse` error format. The body SHALL be a constant string and SHALL NOT include the provider URL, the underlying message or a stack. The filter SHALL log the error class, its message and its `cause` chain at `error` level. Errors that are neither `HttpException` nor `ProviderError` SHALL keep responding `500` with `Internal server error`, and `HttpException` handling SHALL be unchanged.

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
- **THEN** a log entry at `error` level includes the error name, message and the `cause` chain

#### Scenario: Unexpected errors stay 500

- **GIVEN** a controller that throws a plain `Error`
- **WHEN** it is called
- **THEN** the response is `500` with `Internal server error`

#### Scenario: HttpException handling is unchanged

- **GIVEN** a controller that throws `BadRequestException`
- **WHEN** it is called
- **THEN** the response is `400` as before

### Requirement: The contract is reusable by any provider-backed endpoint

A future provider client or category module SHALL obtain the `502` behavior by throwing (or letting propagate) an error that extends `ProviderError`, with no change to the filter and no per-controller mapping code. Provider-backed endpoints SHALL document the `502` response in Swagger with `@ApiBadGatewayResponse`.

#### Scenario: A new provider error needs no filter change

- **GIVEN** a test-only error class extending `ProviderError` that is not known to the filter
- **WHEN** a controller throws it
- **THEN** the response is `502` in the standard error format

#### Scenario: Web treats the 502 as a failed attempt

- **GIVEN** the BFF responds `502` with the error body to both attempts of `fetchFromBff`
- **WHEN** the helper runs
- **THEN** it makes exactly 2 attempts, logs one error and throws, so a page is neither rendered nor cached from it

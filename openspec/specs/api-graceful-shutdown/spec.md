# api-graceful-shutdown Specification

## Purpose

Defines how the API shuts down on `SIGTERM`/`SIGINT` (Cloud Run instance termination): NestJS shutdown hooks drain the app and run lifecycle hooks so in-flight work is not cut off by `SIGKILL`.

## Requirements

### Requirement: API shuts down gracefully on termination signals

`main.ts` SHALL call `app.enableShutdownHooks()` during bootstrap (before `app.listen`) so that `SIGTERM` and `SIGINT` trigger Nest's shutdown sequence: stop accepting new connections, let in-flight requests finish, run lifecycle hooks (`onModuleDestroy`, `beforeApplicationShutdown`, `onApplicationShutdown`), then exit. The container Dockerfile SHALL keep `CMD ["node", "main.js"]` (no init process); Nest's signal listeners make Node as PID 1 handle `SIGTERM` correctly.

#### Scenario: Bootstrap enables shutdown hooks

- **GIVEN** the bootstrap function with `NestFactory.create` mocked/spied
- **WHEN** `bootstrap()` runs
- **THEN** `enableShutdownHooks` is called exactly once, before `listen`

#### Scenario: SIGTERM stops the process promptly

- **GIVEN** the built API (`node main.js`) listening on a test port
- **WHEN** the process receives `SIGTERM`
- **THEN** Nest closes the app and then re-raises the signal (NestJS 12 behavior), so the process terminates by `SIGTERM` (shell status `143`, not an exit code `0`) well within the Cloud Run grace period (under 10 s) and not by `SIGKILL`

#### Scenario: In-flight request completes during shutdown

- **GIVEN** a request in flight when `SIGTERM` arrives
- **WHEN** the shutdown sequence runs
- **THEN** the response is delivered before the process exits

### Requirement: OWID cache requires no shutdown cleanup

`OwidModule` and its in-memory cache (`@nestjs/cache-manager` default Keyv Map store) hold no timers, sockets, or file handles; therefore no `onApplicationShutdown`/`onModuleDestroy` hook SHALL be added for it. This decision SHALL be recorded in `design.md`.

#### Scenario: No lingering handles after close

- **GIVEN** the full `AppModule` initialised in a test
- **WHEN** `app.close()` resolves
- **THEN** Jest reports no open handles attributable to the app (no `--forceExit` is required)

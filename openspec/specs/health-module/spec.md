# health-module Specification

## Purpose

Defines the NestJS HealthModule that encapsulates the health endpoint.

## Requirements

### Requirement: HealthController is encapsulated in a HealthModule

A `HealthModule` SHALL exist at `apps/api/src/health/health.module.ts`. The `HealthModule` SHALL declare `HealthController` in its `controllers` array. `AppModule` SHALL import `HealthModule` instead of declaring `HealthController` directly in its `controllers` array.

#### Scenario: HealthModule is importable as a standalone NestJS module

- **WHEN** `HealthModule` is imported into a `TestingModule`
- **THEN** it provides the `HealthController` and its routes without additional configuration

#### Scenario: AppModule uses HealthModule

- **WHEN** the NestJS application starts
- **THEN** `AppModule` imports array contains `HealthModule`
- **THEN** `AppModule` controllers array does NOT contain `HealthController` directly

#### Scenario: Health endpoint remains functional after refactor

- **WHEN** a client sends `GET /api/v1/health`
- **THEN** the response status is `200 OK`
- **THEN** the response body is `{ "status": "ok" }`

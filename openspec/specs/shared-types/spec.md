# shared-types Specification

## Purpose

Defines the shared TypeScript types for API responses and ecological categories used across apps.

## Requirements

### Requirement: Package shared with base domain types

The `shared` package SHALL export base TypeScript interfaces that represent the data contracts between the BFF and the frontend. It SHALL include at least the base API response interface and the ecological category identifiers.

#### Scenario: Frontend imports types from shared

- **WHEN** a file in `apps/web` imports from `@eco-metrics/shared`
- **THEN** TypeScript resolves the types correctly without errors

#### Scenario: BFF imports types from shared

- **WHEN** a file in `apps/api` imports from `@eco-metrics/shared`
- **THEN** TypeScript resolves the types correctly without errors

### Requirement: Base API response interface

A generic `ApiResponse<T>` interface SHALL exist that wraps all BFF responses with a consistent structure: `data`, `timestamp`, and optionally `error`.

#### Scenario: Successful response is typed correctly

- **WHEN** the BFF returns category data
- **THEN** the response matches the `ApiResponse<T>` interface with `data` populated and no `error`

#### Scenario: Error response is typed correctly

- **WHEN** the BFF returns an error
- **THEN** the response matches `ApiResponse<T>` with `error` populated

### Requirement: Enum of ecological categories

An enum or union type `EcoCategory` SHALL exist with the identifiers of the MVP's initial categories: `air-quality`, `endangered-species`, `global-temperature`, `deforestation`, `ocean-health`, `co2-emissions`.

#### Scenario: Categories available in frontend and backend

- **WHEN** `EcoCategory` is imported from `@eco-metrics/shared`
- **THEN** the six MVP category identifiers are available

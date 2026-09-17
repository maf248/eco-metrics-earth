# shared-types Specification

## Purpose

TBD - created by archiving change monorepo-base-setup. Update Purpose after archive.

## Requirements

### Requirement: Package shared con tipos base del dominio

El package `shared` SHALL exportar interfaces TypeScript base que representen los contratos de datos entre el BFF y el frontend. SHALL incluir al menos la interfaz base de respuesta de API y los identificadores de categorías ecológicas.

#### Scenario: Frontend importa tipos desde shared

- **WHEN** un archivo en `apps/web` importa desde `@eco-metrics/shared`
- **THEN** TypeScript resuelve los tipos correctamente sin errores

#### Scenario: BFF importa tipos desde shared

- **WHEN** un archivo en `apps/api` importa desde `@eco-metrics/shared`
- **THEN** TypeScript resuelve los tipos correctamente sin errores

### Requirement: Interfaz base de respuesta de API

SHALL existir una interfaz genérica `ApiResponse<T>` que envuelva todas las respuestas del BFF con estructura consistente: `data`, `timestamp` y opcionalmente `error`.

#### Scenario: Respuesta exitosa tipada correctamente

- **WHEN** el BFF retorna datos de una categoría
- **THEN** la respuesta cumple con la interfaz `ApiResponse<T>` con `data` poblado y sin `error`

#### Scenario: Respuesta de error tipada correctamente

- **WHEN** el BFF retorna un error
- **THEN** la respuesta cumple con `ApiResponse<T>` con `error` poblado

### Requirement: Enum de categorías ecológicas

SHALL existir un enum o tipo union `EcoCategory` con los identificadores de las categorías iniciales del MVP: `air-quality`, `endangered-species`, `global-temperature`, `deforestation`, `ocean-health`, `co2-emissions`.

#### Scenario: Categorías disponibles en frontend y backend

- **WHEN** se importa `EcoCategory` desde `@eco-metrics/shared`
- **THEN** están disponibles los seis identificadores de categorías del MVP

# api-response-type Specification

## Purpose

Defines the discriminated union shape of the shared API response type.

## Requirements

### Requirement: ApiResponse is a discriminated union with a success boolean

The `ApiResponse<T>` type in `packages/shared/src/lib/api-response.ts` SHALL be a discriminated union type with a `success` boolean discriminant. Both branches SHALL include a `status: number` field and an OPTIONAL `meta?: ApiResponseMeta` field — the response-metadata type defined in the `shared-types` capability: `{ source: DataSourceAttribution; fetchedAt: string; stale?: boolean }`. The type SHALL make it impossible to simultaneously have `data` and `error` populated. The optional `meta` SHALL be backward compatible: every response shape that omits `meta` remains valid, no existing endpoint is required to emit it, and the `success`-based narrowing semantics are unchanged.

#### Scenario: Success branch has data and no error field

- **WHEN** a value is typed as `ApiResponse<T>` and `success` is `true`
- **THEN** TypeScript allows accessing `.data` of type `T`
- **THEN** TypeScript does NOT allow accessing `.error` (field does not exist on the success branch)

#### Scenario: Error branch has error and no data field

- **WHEN** a value is typed as `ApiResponse<T>` and `success` is `false`
- **THEN** TypeScript allows accessing `.error` of type `string`
- **THEN** TypeScript does NOT allow accessing `.data` (field does not exist on the error branch)

#### Scenario: Both branches include status number

- **WHEN** a value is typed as `ApiResponse<T>` regardless of branch
- **THEN** TypeScript allows accessing `.status` of type `number`

#### Scenario: Type narrows correctly inside conditionals

- **WHEN** code checks `if (response.success)`
- **THEN** inside the if-block, `response.data` is accessible and typed as `T`
- **THEN** inside the else-block, `response.error` is accessible and typed as `string`

#### Scenario: Success branch may carry meta

- **WHEN** a value is typed as `ApiResponse<T>` with `success: true` and a `meta` object
- **THEN** TypeScript allows accessing `.meta.source` (a `DataSourceAttribution`) and `.meta.fetchedAt` (a `string`)

#### Scenario: meta is optional and backward compatible

- **GIVEN** the water-footprint endpoint's existing response literal `{ success: true, data, status: 200 }` with no `meta`
- **WHEN** it is assigned to `ApiResponse<WaterFootprintProduct[]>`
- **THEN** it type-checks unchanged — `meta` is optional on both branches and no existing endpoint changes behavior

#### Scenario: meta does not affect narrowing

- **WHEN** code checks `if (response.success)`
- **THEN** narrowing works exactly as before — `response.data` in the if-branch, `response.error` in the else-branch, and `response.meta` (when present) accessible on both

#### Scenario: meta may flag a stale snapshot

- **WHEN** a value is typed as `ApiResponse<T>` with `success: true` and `meta.stale` set to `true`
- **THEN** TypeScript allows accessing `.meta.stale` as `boolean | undefined`

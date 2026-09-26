# api-response-type Specification

## Purpose

Defines the discriminated union shape of the shared API response type.

## Requirements

### Requirement: ApiResponse is a discriminated union with a success boolean

The `ApiResponse<T>` type in `packages/shared/src/lib/api-response.ts` SHALL be a discriminated union type with a `success` boolean discriminant. Both branches SHALL include a `status: number` field. The type SHALL make it impossible to simultaneously have `data` and `error` populated.

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

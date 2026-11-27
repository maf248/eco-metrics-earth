## ADDED Requirements

### Requirement: Divergent chart tokens are guarded like the other chart tokens

The seven divergent tokens `--chart-div-1` … `--chart-div-7` SHALL follow the chart token rules of "Every token has a consumer and is documented": they are not exposed as Tailwind utilities, their consumer is the chart theme adapter that reads them by name, a token counts as used when its name is in the adapter's exported token lists, each has a light value on `:root` and a dark value under `.dark`, and each is listed in `docs/design-system.md` with its role and both values. `apps/web/__tests__/designTokens.test.ts` SHALL fail on a divergent token without a dark value, without a consumer or missing from the document.

#### Scenario: No orphan divergent tokens

- **WHEN** the guard test compares the declared `--chart-div-*` names with the adapter's divergent token list
- **THEN** both sets are equal

#### Scenario: Missing dark value fails

- **GIVEN** a `--chart-div-*` token declared on `:root` without a `.dark` value
- **WHEN** the guard test runs
- **THEN** it fails

#### Scenario: Document lists every divergent token

- **WHEN** the divergent token table in `docs/design-system.md` is compared with `globals.css`
- **THEN** every `--chart-div-*` token appears with its light and dark values

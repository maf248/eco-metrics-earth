## MODIFIED Requirements

### Requirement: Every token has a consumer and is documented

Each semantic token SHALL be used by at least one page or component, and SHALL be listed in `docs/design-system.md` with its role, light value, and dark value. Tokens SHALL NOT be added speculatively. Chart tokens (the categorical `--chart-*` palette and the `--energy-*` energy mix palette) are not exposed as Tailwind utilities (chart colors never go through Tailwind); their consumer is the chart theme adapter, which reads them by name, and a token counts as used when its name is in the adapter's exported token lists.

#### Scenario: No orphan tokens

- **WHEN** each token name declared in `globals.css` other than the chart tokens is searched for in the files under `apps/web/src/` other than `globals.css`
- **THEN** every token is referenced by at least one utility class or `var()` usage (its own `@theme inline` mapping inside `globals.css` does not count)

#### Scenario: Design system lists every token

- **WHEN** the token table in `docs/design-system.md` is compared with the token declarations in `globals.css`
- **THEN** both contain the same token names with the same light and dark values

#### Scenario: Chart tokens are consumed by the adapter

- **WHEN** the `--chart-*` names declared in `globals.css` are compared with the lists exported by the chart theme adapter
- **THEN** both sets are equal, and each name has both a `:root` and a `.dark` declaration

#### Scenario: Chart tokens need no Tailwind mapping

- **WHEN** `designTokens.test.ts` runs with the chart tokens declared but not mapped in `@theme inline`
- **THEN** the suite passes, while an unmapped or unused non-chart token still fails it

#### Scenario: Energy tokens are consumed by the adapter

- **WHEN** the `--energy-*` names declared in `globals.css` are compared with `CHART_ENERGY_TOKENS`
- **THEN** both sets are equal, and each name has both a `:root` and a `.dark` declaration

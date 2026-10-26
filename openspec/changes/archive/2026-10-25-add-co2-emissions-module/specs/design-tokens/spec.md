## MODIFIED Requirements

### Requirement: Token values use oklch

Colors in UI token values SHALL be written in `oklch()` notation (with an alpha component where the role is translucent), including colors inside non-color tokens such as shadows. A value taken from Tailwind's palette SHALL match that palette entry exactly. The only exception is the chart tokens (`--chart-1` to `--chart-8`): they SHALL be written in hex, the form in which their values were validated (see `docs/design-system.md`, Color Palettes), because the chart theme adapter resolves any CSS color format.

#### Scenario: Token value format

- **WHEN** the UI token declarations in `globals.css` are read (every token except the chart tokens)
- **THEN** every color inside each light and dark token value (including colors inside shadow values) is written as `oklch()`

#### Scenario: Chart tokens use the validated hex values

- **WHEN** the chart token declarations in `globals.css` are read
- **THEN** each of the 8 chart tokens has a light and a dark hex value equal to the one listed in `docs/design-system.md`

### Requirement: Every token has a consumer and is documented

Each semantic token SHALL be used by at least one page or component, and SHALL be listed in `docs/design-system.md` with its role, light value, and dark value. Tokens SHALL NOT be added speculatively. Chart tokens are not exposed as Tailwind utilities (chart colors never go through Tailwind); their consumer is the chart theme adapter, which reads them by name, and a token counts as used when its name is in the adapter's exported token lists.

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

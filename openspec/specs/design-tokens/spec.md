# design-tokens Specification

## Purpose

Defines the semantic color token system of `apps/web`: where colors are declared, how a single token resolves to its light or dark value, and how pages and components consume tokens instead of Tailwind palette utilities.

## Requirements

### Requirement: Colors are declared once as semantic tokens

Every color used by pages and components SHALL be a semantic token declared in `apps/web/src/app/globals.css` with one light value and one dark value, except the documented exceptions. The two values MAY be equal for a theme-invariant role (e.g. the focus ring). Each token SHALL be exposed to Tailwind under a single name, so one utility (e.g. `bg-surface`) yields the correct color in both themes.

#### Scenario: One utility renders both theme values

- **GIVEN** an element styled with a token utility (e.g. `bg-surface`)
- **WHEN** the `<html>` element does not have the `dark` class
- **THEN** the element renders the token's light value
- **AND WHEN** the `dark` class is added to `<html>`
- **THEN** the same element renders the token's dark value without any class change on the element

### Requirement: Token values use oklch

Colors in UI token values SHALL be written in `oklch()` notation (with an alpha component where the role is translucent), including colors inside non-color tokens such as shadows. A value taken from Tailwind's palette SHALL match that palette entry exactly. The only exception is the chart tokens (`--chart-1` to `--chart-8`): they SHALL be written in hex, the form in which their values were validated (see `docs/design-system.md`, Color Palettes), because the chart theme adapter resolves any CSS color format.

#### Scenario: Token value format

- **WHEN** the UI token declarations in `globals.css` are read (every token except the chart tokens)
- **THEN** every color inside each light and dark token value (including colors inside shadow values) is written as `oklch()`

#### Scenario: Chart tokens use the validated hex values

- **WHEN** the chart token declarations in `globals.css` are read
- **THEN** each of the 8 chart tokens has a light and a dark hex value equal to the one listed in `docs/design-system.md`

### Requirement: Pages and components use tokens, not palette utilities

Files under `apps/web/src/app/` and `apps/web/src/components/` SHALL NOT use Tailwind palette color utilities (`white`, `black`, or any `<hue>-<shade>`, with or without opacity or variants such as `dark:`, `hover:`, `lg:`) for any color property. They SHALL use token utilities. Keywords that are not colors of the palette (`transparent`, `current`, `inherit`) remain allowed.

#### Scenario: No palette color utilities outside the documented exceptions

- **WHEN** `apps/web/src/app/` and `apps/web/src/components/` are searched for palette color utilities (`bg-`, `text-`, `border-`, `ring-`, `ring-offset-`, `from-`, `via-`, `to-`, `fill-`, `stroke-`, `outline-`, `divide-`, `decoration-`, `placeholder-`, `caret-`, `shadow-` followed by `white`, `black`, or `<hue>-<shade>`)
- **THEN** the only matches are the exceptions documented in `docs/design-system.md`

#### Scenario: Category icon fills are not tokens

- **WHEN** an eco-category icon component renders
- **THEN** its SVG fills remain the hardcoded multicolor values, untouched by the token system

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

### Requirement: Remaining exceptions are documented

Any palette color utility or `dark:` variant left in `apps/web/src/app/` or `apps/web/src/components/` SHALL be a non-token effect (e.g. a lit vs. dimmed state indicator) listed in `docs/design-system.md` with the reason it is not a token.

#### Scenario: Exception list matches the code

- **WHEN** the palette color utilities and `dark:` variants remaining in `apps/web/src/app/` and `apps/web/src/components/` are listed
- **THEN** each one corresponds to an entry in the design system's exception list

### Requirement: Token rules are enforced by a unit test

The web unit test suite SHALL include a test that fails when a palette color utility appears in `apps/web/src/app/` or `apps/web/src/components/` outside the exception allowlist, or when a token declared in `globals.css` has no consumer.

#### Scenario: A new palette color fails the suite

- **GIVEN** a component adds `text-gray-400` (or `dark:text-gray-400`)
- **WHEN** `npx nx test web` runs
- **THEN** the token-rules test fails and names the file and the offending class

#### Scenario: An unused token fails the suite

- **GIVEN** a token is declared in `globals.css` but referenced nowhere else under `apps/web/src/`
- **WHEN** `npx nx test web` runs
- **THEN** the token-rules test fails and names the orphan token

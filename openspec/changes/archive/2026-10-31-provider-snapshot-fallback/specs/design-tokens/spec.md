## ADDED Requirements

### Requirement: Warning tokens exist for notices and degraded states

`apps/web/src/app/globals.css` SHALL declare three semantic tokens, each with a light value on `:root`, a dark value under `.dark` and an `@theme inline` mapping: `warning-surface` (notice background), `warning-line` (notice border) and `warning-fg` (notice text and warning icon). They SHALL be written in `oklch()` like the other UI tokens, SHALL NOT be an error red, and SHALL be consumed by `StaleDataNotice` and `DataUnavailable`. In both themes `warning-fg` SHALL reach a WCAG contrast of at least 4.5:1 on `warning-surface` and at least 3:1 on `surface-raised`, `surface` and `warning-surface`; the measured ratios SHALL be recorded in `docs/design-system.md`.

#### Scenario: Declared in both themes

- **WHEN** `globals.css` is read
- **THEN** each of the three tokens has a `:root` value, a `.dark` value and an `@theme inline` mapping

#### Scenario: Documented

- **WHEN** the Color Tokens table in `docs/design-system.md` is compared with `globals.css`
- **THEN** the three tokens appear with their role, light value and dark value, matching the declarations

#### Scenario: Consumed

- **WHEN** the guard test searches `apps/web/src/` for each token
- **THEN** every warning token is referenced by a component

#### Scenario: Contrast

- **WHEN** the ratios of `warning-fg` over `warning-surface`, `surface` and `surface-raised` are computed for both themes
- **THEN** each meets the thresholds above and the values are listed in the design system doc

#### Scenario: No new exception

- **WHEN** `designTokens.test.ts` runs
- **THEN** it passes with the allowlist unchanged

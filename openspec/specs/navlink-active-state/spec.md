# navlink-active-state Specification

## Purpose
TBD - created by archiving change accessibility-and-bugs. Update Purpose after archive.
## Requirements
### Requirement: NavLink active state is invariant to trailing slashes
The `NavLink` component's `isActive` logic SHALL normalise both the `href` prop and the current `pathname` (from `usePathname`) by removing trailing slashes before comparison. The root path `/` SHALL remain active when pathname is `/`.

#### Scenario: NavLink is active when href and pathname match with trailing slash
- **WHEN** `href="/air-quality/"` and `usePathname()` returns `"/air-quality/"`
- **THEN** the NavLink is active (correct — trivial match)

#### Scenario: NavLink is active when pathname has trailing slash but href does not
- **WHEN** `href="/air-quality"` and `usePathname()` returns `"/air-quality/"`
- **THEN** the NavLink is active (trailing slash normalised before comparison)

#### Scenario: NavLink is active when href has trailing slash but pathname does not
- **WHEN** `href="/air-quality/"` and `usePathname()` returns `"/air-quality"`
- **THEN** the NavLink is active (trailing slash normalised before comparison)

#### Scenario: Root NavLink remains active on root path
- **WHEN** `href="/"` and `usePathname()` returns `"/"`
- **THEN** the NavLink is active
- **THEN** the normalisation does not produce an empty string for the root path

#### Scenario: NavLink is not active when on a different path
- **WHEN** `href="/air-quality/"` and `usePathname()` returns `"/co2-emissions/"`
- **THEN** the NavLink is not active


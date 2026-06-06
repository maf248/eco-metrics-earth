## ADDED Requirements

### Requirement: NavLink accepts active state as a prop
The `NavLink` component SHALL accept an `isActive` prop of type `boolean` instead of computing it internally via `usePathname()`.

#### Scenario: NavLink renders with isActive prop
- **WHEN** `NavLink` receives `isActive={true}`
- **THEN** it SHALL apply the active visual styles (`text-emerald-700`, background highlight, `aria-current="page"`)
- **AND** the icon wrapper SHALL use the active background style

#### Scenario: NavLink renders with isActive false
- **WHEN** `NavLink` receives `isActive={false}`
- **THEN** it SHALL apply the inactive visual styles (gray text, no background, no `aria-current`)
- **AND** hover styles SHALL still apply on mouse over

### Requirement: NavLink is wrapped in React.memo
The `NavLink` component export SHALL be wrapped with `React.memo` to prevent re-rendering when its props have not changed.

#### Scenario: NavLink skips re-render when props are unchanged
- **WHEN** a parent component re-renders
- **AND** the `href`, `icon`, `label`, and `isActive` props passed to `NavLink` have not changed
- **THEN** `NavLink` SHALL NOT re-execute its render function

#### Scenario: NavLink re-renders when isActive changes
- **WHEN** the `isActive` prop changes from `false` to `true` (or vice versa)
- **THEN** `NavLink` SHALL re-render with the updated active state

### Requirement: Navbar computes isActive centrally
The `Navbar` component SHALL call `usePathname()` once and compute `isActive` for each `NavLink` item, passing it as a prop.

#### Scenario: Navbar passes correct isActive to each NavLink
- **WHEN** the current route is `/air-quality/`
- **THEN** the "Air Quality" `NavLink` SHALL receive `isActive={true}`
- **AND** all other `NavLink` instances SHALL receive `isActive={false}`

#### Scenario: Navbar updates isActive after navigation
- **WHEN** user navigates from `/air-quality/` to `/co2-emissions/`
- **THEN** the "Air Quality" `NavLink` SHALL receive `isActive={false}`
- **AND** the "CO2 Emissions" `NavLink` SHALL receive `isActive={true}`

### Requirement: Path normalisation utility is extracted
The `normalise` helper function (removes trailing slashes with root-path guard) SHALL be extracted to `apps/web/src/lib/path.ts` so it can be imported by both `Navbar` and test files.

#### Scenario: normalise strips trailing slashes
- **WHEN** `normalise('/air-quality/')` is called
- **THEN** it SHALL return `'/air-quality'`

#### Scenario: normalise preserves root path
- **WHEN** `normalise('/')` is called
- **THEN** it SHALL return `'/'` (not an empty string)

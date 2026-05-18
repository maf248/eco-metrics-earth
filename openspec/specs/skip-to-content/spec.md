# skip-to-content Specification

## Purpose
TBD - created by archiving change a11y-layout-landmark. Update Purpose after archive.
## Requirements
### Requirement: Skip link targets the main landmark
The root layout (`apps/web/src/app/layout.tsx`) SHALL render a skip-navigation anchor with `href="#main-content"` that precedes the Navbar in the DOM.

The skip link target SHALL be the `<main>` element rendered by the active page, identified by `id="main-content"` and `tabIndex={-1}`.

The wrapper `<div>` inside the layout SHALL NOT carry `id="main-content"` or `tabIndex`.

#### Scenario: Skip link points to main element
- **WHEN** a keyboard user activates the skip link
- **THEN** focus moves to the `<main id="main-content">` element, not a `<div>`

#### Scenario: Layout wrapper div has no id
- **WHEN** the root layout renders
- **THEN** the `<div>` that wraps `{children}` does NOT have `id="main-content"`

### Requirement: Home page main landmark is the skip target
`apps/web/src/app/page.tsx` SHALL render a `<main>` element with `id="main-content"` and `tabIndex={-1}` as the outermost landmark of its content.

#### Scenario: Home page main has correct id
- **WHEN** the home page renders
- **THEN** the DOM contains exactly one `<main id="main-content" tabIndex={-1}>`

### Requirement: Category page main landmark is the skip target
`apps/web/src/app/[category]/page.tsx` SHALL render a `<main>` element with `id="main-content"` and `tabIndex={-1}` as the outermost landmark of its content.

#### Scenario: Category page main has correct id
- **WHEN** any valid category page renders
- **THEN** the DOM contains exactly one `<main id="main-content" tabIndex={-1}>`


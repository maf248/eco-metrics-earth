# E2E Accessibility Tests

## ADDED Requirements

### Requirement: axe-core audits on home page
The E2E test suite SHALL run an axe-core accessibility scan on the home page. The scan MUST report zero violations at "critical" and "serious" severity levels.

#### Scenario: Home page has no critical or serious a11y violations
- **WHEN** axe-core scans the home page
- **THEN** zero violations are reported at severity "critical"
- **AND** zero violations are reported at severity "serious"

### Requirement: axe-core audits on all category pages
The E2E test suite SHALL run an axe-core accessibility scan on each of the 11 eco-category pages. Each scan MUST report zero violations at "critical" and "serious" severity levels.

#### Scenario: Category pages have no critical or serious a11y violations
- **WHEN** axe-core scans `/air-quality/`
- **THEN** zero violations are reported at "critical" or "serious" severity

#### Scenario: All 11 categories pass a11y audit
- **WHEN** axe-core scans each of the 11 category pages
- **THEN** each page reports zero "critical" violations
- **AND** each page reports zero "serious" violations

### Requirement: Skip-to-content link is present and functional
The home page and all category pages SHALL include a skip-to-content link that becomes visible on keyboard focus and targets `#main-content`.

#### Scenario: Skip-to-content link exists on home page
- **WHEN** the browser loads the home page
- **THEN** a link with text "Skip to content" (or similar) is present
- **AND** the link's `href` targets `#main-content`

#### Scenario: Skip-to-content link exists on category pages
- **WHEN** the browser loads `/air-quality/`
- **THEN** a link targeting `#main-content` is present

### Requirement: Semantic navigation landmarks
The web app SHALL use semantic HTML landmarks: `<nav>` with `aria-label` for navigation, `<header>` for site header, `<main>` for primary content.

#### Scenario: Navigation has accessible label
- **WHEN** the browser loads any page
- **THEN** a `<nav>` element with `aria-label="Main navigation"` is present

#### Scenario: Header is semantic
- **WHEN** the browser loads any page on mobile viewport
- **THEN** a `<header>` element is present for the site header

#### Scenario: Main content landmark exists
- **WHEN** the browser loads any page
- **THEN** a `<main id="main-content">` element is present

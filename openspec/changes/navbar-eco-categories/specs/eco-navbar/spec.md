## ADDED Requirements

### Requirement: Render a link for every ECO_CATEGORY
The `Navbar` component SHALL render one navigation link per value in `ECO_CATEGORIES`, in the order they are defined.

#### Scenario: All six links are rendered
- **WHEN** `Navbar` is rendered
- **THEN** six navigation links are present, one for each eco-category slug

#### Scenario: Link href matches the slug route
- **WHEN** a navigation link for slug `air-quality` is rendered
- **THEN** its `href` attribute is `/air-quality`

#### Scenario: Link text is the human-readable title
- **WHEN** a navigation link for slug `ocean-health` is rendered
- **THEN** its visible text is `'Ocean Health'`

### Requirement: Highlight the currently active route
The `Navbar` SHALL visually distinguish the link whose href matches the current URL pathname.

#### Scenario: Active link receives active styling
- **WHEN** the current pathname is `/air-quality`
- **THEN** the link for `/air-quality` has an `aria-current="page"` attribute

#### Scenario: Inactive links do not receive active styling
- **WHEN** the current pathname is `/air-quality`
- **THEN** all other links do NOT have `aria-current="page"`

### Requirement: Navbar is always visible
The `Navbar` SHALL be mounted in the root layout so it appears on every page.

#### Scenario: Navbar present on home page
- **WHEN** the root layout renders
- **THEN** the `<nav>` element is present in the rendered output

#### Scenario: Navbar present on category page
- **WHEN** the `[category]` page renders within the root layout
- **THEN** the `<nav>` element is present in the rendered output

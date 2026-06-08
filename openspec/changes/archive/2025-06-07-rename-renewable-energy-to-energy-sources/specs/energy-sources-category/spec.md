## ADDED Requirements

### Requirement: Shared taxonomy defines energy-sources slug
The `ECO_CATEGORIES` constant SHALL include `ENERGY_SOURCES: 'energy-sources'` and SHALL NOT include any `renewable-energy` entry.

#### Scenario: EcoCategory enum contains energy-sources
- **WHEN** the `ECO_CATEGORIES` object is inspected
- **THEN** it MUST contain the key `ENERGY_SOURCES` with value `'energy-sources'`
- **AND** it MUST NOT contain any key or value referencing `renewable-energy`

### Requirement: Category page renders for energy-sources slug
The dynamic `[category]` route SHALL render the category page when the slug is `energy-sources` and SHALL return a 404 for `renewable-energy` (because the redirect handles the old slug at the edge).

#### Scenario: Valid energy-sources page
- **WHEN** a request is made to `/energy-sources/`
- **THEN** the page MUST render with status 200
- **AND** the page title MUST contain "Energy Sources"

#### Scenario: Invalid renewable-energy page (no redirect at app level)
- **WHEN** a request is made to `/renewable-energy/` inside the App Router without hitting the edge redirect
- **THEN** the app MUST return a 404

### Requirement: Navigation mappings use the new slug and title
All navigation mapping files (`categoryIcon.ts`, `categoryTitle.ts`, `navItems.ts`, `slugToTitle.ts`, `path.ts`) SHALL map `energy-sources` to the title "Energy Sources" and to the `EnergySourcesIcon` component.

#### Scenario: Navigation link points to energy-sources
- **WHEN** the navbar renders
- **THEN** the link for the renamed category MUST have `href="/energy-sources/"`
- **AND** its accessible label MUST be "Energy Sources"

### Requirement: Public route redirect preserves SEO
The old public route `/renewable-energy/` SHALL permanently redirect to `/energy-sources/`.

#### Scenario: Old slug redirects
- **WHEN** a request is made to `/renewable-energy/`
- **THEN** the response MUST be a 308 permanent redirect
- **AND** the `Location` header MUST be `/energy-sources/`

### Requirement: Icon component and asset are renamed
The React icon component SHALL be named `EnergySourcesIcon` and exported from the icons barrel. The static SVG asset SHALL be named `energy-sources.svg`.

#### Scenario: Icon barrel exports EnergySourcesIcon
- **WHEN** the icons index is imported
- **THEN** it MUST export `EnergySourcesIcon`
- **AND** it MUST NOT export `RenewableEnergyIcon`

### Requirement: SEO metadata reflects the new category
The sitemap, robots, and any metadata generation logic SHALL treat `energy-sources` as a valid category and SHALL NOT reference `renewable-energy`.

#### Scenario: Sitemap contains energy-sources URL
- **WHEN** the sitemap is generated
- **THEN** it MUST include `<loc>.../energy-sources/</loc>`
- **AND** it MUST NOT include `<loc>.../renewable-energy/</loc>`

### Requirement: Data-sources documentation is renamed and updated
The data-sources markdown SHALL be renamed from `renewable-energy.md` to `energy-sources.md` and its front matter/title SHALL reflect the broader scope.

#### Scenario: Documentation file exists with new name
- **WHEN** the docs directory is listed
- **THEN** a file named `energy-sources.md` MUST exist
- **AND** a file named `renewable-energy.md` MUST NOT exist

### Requirement: Cross-project configuration is updated
The `openspec/config.yaml` and root `README.md` SHALL list `energy-sources` in the category enumeration and SHALL NOT list `renewable-energy`.

#### Scenario: Config references new slug
- **WHEN** `openspec/config.yaml` is inspected
- **THEN** it MUST reference `energy-sources`
- **AND** it MUST NOT reference `renewable-energy`

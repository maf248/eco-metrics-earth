# E2E Navigation Tests

## ADDED Requirements

### Requirement: Home page renders correctly
The E2E test suite SHALL verify that navigating to `/` renders the home page with the site logo, brand text, main heading, and skip-to-content link.

#### Scenario: Home page loads successfully
- **WHEN** the browser navigates to `/`
- **THEN** the page title is "eco-metrics earth"
- **AND** the `<main id="main-content">` element is present
- **AND** the site logo is visible
- **AND** the brand text "eco-metrics earth" is visible
- **AND** a skip-to-content link is present

### Requirement: All 11 eco-category pages render correctly
The E2E test suite SHALL verify that each of the 11 eco-category pages renders with the correct URL (trailing slash), title, heading, and category icon.

#### Scenario: Each category page loads with correct metadata
- **WHEN** the browser navigates to `/{category}/` for each of the 11 categories
- **THEN** the URL ends with a trailing slash
- **AND** the page title matches "{Category Title} — eco-metrics earth"
- **AND** a heading element displays the category title
- **AND** the category-specific icon component is present in the DOM

#### Scenario: Category title override for waste-recycling
- **WHEN** the browser navigates to `/waste-recycling/`
- **THEN** the heading displays "Waste & Recycling" (not "Waste Recycling")

### Requirement: Desktop sidebar navigation works
On viewport widths >= 768px, the Navbar SHALL render as a left sidebar. Clicking any NavLink SHALL navigate to the corresponding category page.

#### Scenario: Sidebar navigation navigates to correct category
- **WHEN** the user clicks a NavLink in the desktop sidebar
- **THEN** the browser navigates to the corresponding category URL
- **AND** the correct page content loads

#### Scenario: Active NavLink has aria-current="page"
- **WHEN** the user is on a category page
- **THEN** the corresponding NavLink has `aria-current="page"`
- **AND** all other NavLinks do not have `aria-current="page"`

#### Scenario: Home NavLink is active on home page
- **WHEN** the user is on the home page (`/`)
- **THEN** the home NavLink has `aria-current="page"`

### Requirement: 404 page renders for unknown routes
The E2E test suite SHALL verify that navigating to a non-existent route displays the custom 404 page with the NotFoundIcon and a link back to home.

#### Scenario: Unknown route shows 404 page
- **WHEN** the browser navigates to `/nonexistent/`
- **THEN** the HTTP status code is 404
- **AND** the NotFoundIcon is visible
- **AND** a link to the home page is present
- **AND** clicking the home link navigates to `/`

### Requirement: Category pages return 200 status code
Each of the 11 eco-category pages SHALL return HTTP 200 when requested.

#### Scenario: All category pages return 200
- **WHEN** the browser navigates to `/{category}/` for each category
- **THEN** the HTTP response status is 200

## ADDED Requirements

### Requirement: Custom 404 page returns HTTP 404 status

The web app SHALL render a custom not-found page at `app/not-found.tsx`. Next.js SHALL serve this page with HTTP status 404 for any URL that does not match a known route or that explicitly calls `notFound()`.

#### Scenario: Unknown URL returns 404

- **WHEN** a client requests a URL that does not match any defined route (e.g. `/papa/`)
- **THEN** the server returns HTTP status 404 and renders the custom not-found page

#### Scenario: Invalid category slug returns 404

- **WHEN** a client requests `/[slug]/` where `slug` is not a valid `EcoCategory`
- **THEN** `notFound()` is called inside `CategoryPage` and `generateMetadata`, and the server returns HTTP 404

---

### Requirement: Not-found page shows generic copy without URL disclosure

The not-found page SHALL display a generic human-readable message. It SHALL NOT render the requested URL, slug, or any path segment anywhere on the page.

#### Scenario: Heading is generic

- **WHEN** the not-found page is rendered
- **THEN** the `<h1>` contains a fixed generic string (e.g. "¡Ups! We couldn't find that...") and does not contain the requested path

#### Scenario: No URL visible on page

- **WHEN** the not-found page is rendered for any URL
- **THEN** no element on the page displays the requested URL or slug

---

### Requirement: Not-found page displays branded error icon linking to home

The not-found page SHALL display an error SVG icon at `width=128 height=128` (double the standard category icon size of 64×64). The icon SHALL be wrapped in a `<Link href="/">` with `aria-label="Go back to home"` so users can recover to the home page. The icon image SHALL be decorative (`alt=""` + `aria-hidden`).

#### Scenario: Icon links back to home

- **WHEN** the not-found page is rendered
- **THEN** a link element with `aria-label` matching "go back to home" (case-insensitive) is present with `href="/"`

#### Scenario: Icon is decorative

- **WHEN** the not-found page is rendered
- **THEN** the icon image has `alt=""` and is not exposed as a named image in the accessibility tree

---

### Requirement: Not-found page has correct page title metadata

The not-found page SHALL export `metadata.title = 'Page Not Found'`. Combined with the root layout title template, the browser tab SHALL read "Page Not Found — eco-metrics earth".

#### Scenario: Page title in browser tab

- **WHEN** the not-found page is rendered
- **THEN** the document title is "Page Not Found — eco-metrics earth"

---

### Requirement: Category page validates slug against ECO_CATEGORIES

`apps/web/src/app/[category]/page.tsx` SHALL validate the `category` param against `Object.values(ECO_CATEGORIES)` in both the default export component and `generateMetadata`. If the slug is not a valid `EcoCategory`, `notFound()` SHALL be called immediately.

#### Scenario: Valid slug renders the category page

- **WHEN** a client requests `/air-quality/`
- **THEN** the category page renders with title "Air Quality"

#### Scenario: Invalid slug triggers notFound

- **WHEN** `CategoryPage` is called with `params: { category: 'papa' }`
- **THEN** `notFound()` is called and no page content is rendered

#### Scenario: generateMetadata calls notFound for invalid slug

- **WHEN** `generateMetadata` is called with `params: { category: 'invalid' }`
- **THEN** `notFound()` is called before any metadata is returned

---

### Requirement: Home page logo is 128×128px

The home page (`app/page.tsx`) logo icon SHALL be rendered at `width=128 height=128` (previously 64×64). The container div SHALL be `w-48 h-48` to accommodate the larger image with consistent padding.

#### Scenario: Home page logo renders at double size

- **WHEN** the home page is rendered
- **THEN** the logo `<Image>` element has `width=128` and `height=128`

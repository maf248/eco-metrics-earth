# home-page Specification

## Purpose

Defines what the home page shows: the value proposition, the list of categories with live
data that leads visitors into the site, and the structured data that describes the site.

## Requirements

### Requirement: Home hero states the value proposition

The home page SHALL render, above everything else, the site logo at the size of a category
header icon, a single `<h1>` with the text `Environmental data, made readable`, the shared
site description as a paragraph, and one call to action labelled `Explore the data` that
leads to the list of topics on the same page. The home page SHALL NOT contain the text
"coming soon". The logo SHALL be decorative (`aria-hidden`).

#### Scenario: Heading and description

- **WHEN** the home page is rendered
- **THEN** it has exactly one `<h1>` and its text is `Environmental data, made readable`
- **AND** the shared site description is present as text
- **AND** the text "coming soon" is absent

#### Scenario: Hero call to action leads to the topics

- **WHEN** the visitor activates the `Explore the data` link
- **THEN** the page scrolls to the list of topics, whose heading is not covered by the fixed mobile header

#### Scenario: The scroll is animated unless motion is reduced

- **WHEN** the visitor activates the `Explore the data` link without a reduced-motion preference
- **THEN** the page scrolls smoothly to the topics
- **AND** with `prefers-reduced-motion: reduce` the page jumps there instantly
- **AND** no other scroll of the site is animated: route changes and the scroll position restored by back and forward stay instant

### Requirement: Home headline types itself in

The home `<h1>` SHALL be shown in the monospace accent style of the brand and SHALL type itself in, one character at a time, followed by a blinking terminal cursor. The full headline SHALL be in the server-rendered HTML at its final size, so the animation needs no JavaScript and moves no other content. The heading's accessible name SHALL be the plain headline. With `prefers-reduced-motion: reduce` the headline and a steady cursor SHALL be visible at once.

#### Scenario: Headline is in the HTML and named plainly

- **WHEN** `/` is requested without executing JavaScript
- **THEN** the `<h1>` contains the text `Environmental data, made readable`, followed only by the decorative cursor glyph
- **AND** its accessible name is exactly `Environmental data, made readable`

#### Scenario: Typing does not shift the layout

- **WHEN** the headline is typing
- **THEN** the description and the call to action below it keep their position

#### Scenario: Reduced motion

- **WHEN** the visitor prefers reduced motion
- **THEN** the whole headline is visible immediately and the cursor does not blink

### Requirement: Home lists the categories with live data

The home page SHALL render, under an `<h2>`, one card per category with live data and none
for a category without it. Cards SHALL follow the order of the main navigation. Each card
SHALL show the category icon (decorative), the category's keyword-bearing title as an
`<h3>`, a short description, and a call to action link `Explore <category name>` whose
destination is the category URL with a trailing slash. The whole card SHALL be clickable
through that single link.

#### Scenario: Only live categories have a card

- **WHEN** the home page is rendered
- **THEN** it has one card for each of `global-temperature`, `co2-emissions`, `energy-sources` and `water-footprint`, in that order
- **AND** no card or link for any placeholder category inside the page content

#### Scenario: Card content and link

- **WHEN** the card of `co2-emissions` is read
- **THEN** it has an `<h3>` with `CO2 Emissions by Country`, a short description and a link named `Explore CO2 Emissions` to `/co2-emissions/`

#### Scenario: A category that ships data joins the home

- **GIVEN** a category gains live data and its card description
- **WHEN** the home page is rendered
- **THEN** its card appears at its position in the navigation order, with no change to the home page itself

### Requirement: Live categories come from configuration

The set of categories the home lists SHALL be derived from the same client-safe
configuration that tells a live category from a placeholder across the site, and SHALL NOT
depend on a request to the BFF. Every live category SHALL have a card description of at
most 120 characters, and no placeholder category SHALL have one.

#### Scenario: Card copy matches the live set

- **WHEN** the unit test compares the categories with a card description against the live categories
- **THEN** both sets are equal

#### Scenario: The live set matches the page registry

- **WHEN** the unit test compares the live categories against the category page registry
- **THEN** both sets are equal

#### Scenario: Home makes no BFF request

- **WHEN** `npx nx build web` runs with no API server listening
- **THEN** the home page is pre-rendered as static HTML and the build succeeds

### Requirement: Home links to the data sources

The home page SHALL render, under an `<h2>`, a short block stating that every figure comes
from open, cited sources, with a link to `/data-sources/`.

#### Scenario: Data sources link

- **WHEN** the home page is rendered
- **THEN** its content has a link to `/data-sources/` under a second-level heading about the origin of the data

### Requirement: Home content is server-rendered and semantic

All home content SHALL be present in the HTML of the response, before the footer and
outside any hidden element, with no client-side data loading. The page SHALL leave the
`<main>` landmark to the root layout and SHALL keep a heading order of one `<h1>`, then
`<h2>` sections, with `<h3>` only inside the topics section. Internal links SHALL end with
a trailing slash.

#### Scenario: Complete HTML without JavaScript

- **WHEN** `/` is requested without executing JavaScript
- **THEN** the `<h1>`, the four cards with their links and the data sources link are in the HTML before `<footer`
- **AND** the HTML has exactly one `<main>`

#### Scenario: Accessibility audit

- **WHEN** the E2E accessibility spec audits the home page in both themes
- **THEN** it reports no violations

### Requirement: Home declares site structured data

The home page SHALL embed one JSON-LD script with a schema.org `WebSite` (name, canonical
home URL, the shared site description, `inLanguage: "en"`, and its publisher) and an
`Organization` (name, canonical home URL and an absolute URL of a raster logo). URLs SHALL
be built from the configured site URL.

#### Scenario: WebSite and Organization are present

- **WHEN** the JSON-LD of `/` is parsed
- **THEN** it contains a `WebSite` whose `url` is the site URL with a trailing slash and whose `name` is `eco-metrics earth`
- **AND** an `Organization` with the same `url` and an absolute `logo` URL
- **AND** the `WebSite` publisher references that `Organization`

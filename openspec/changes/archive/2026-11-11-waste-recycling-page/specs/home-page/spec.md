# Spec Delta

## MODIFIED Requirements

### Requirement: Home lists the categories with live data

The home page SHALL render, under an `<h2>`, one card per category with live data and none
for a category without it. Cards SHALL follow the order of the main navigation. Each card
SHALL show the category icon (decorative), the category's keyword-bearing title as an
`<h3>`, a short description, and a call to action link `Explore <category name>` whose
destination is the category URL with a trailing slash. The whole card SHALL be clickable
through that single link.

#### Scenario: Only live categories have a card

- **WHEN** the home page is rendered
- **THEN** it has one card for each of `waste-recycling`, `global-temperature`, `co2-emissions`, `energy-sources` and `water-footprint`, in that order
- **AND** no card or link for any placeholder category inside the page content

#### Scenario: Card content and link

- **WHEN** the card of `co2-emissions` is read
- **THEN** it has an `<h3>` with `CO2 Emissions by Country`, a short description and a link named `Explore CO2 Emissions` to `/co2-emissions/`

#### Scenario: A category that ships data joins the home

- **GIVEN** a category gains live data and its card description
- **WHEN** the home page is rendered
- **THEN** its card appears at its position in the navigation order, with no change to the home page itself

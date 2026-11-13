# waste-recycling-page Specification

## Purpose

Defines the Waste & Recycling page: how much waste the world and each country generate,
what happens to it, what it is made of and how it is projected to grow, from the World Bank
What a Waste 3.0 dataset.

## Requirements

### Requirement: Waste and recycling page is a live category

`/waste-recycling/` SHALL render, below the common category header, the page content from the waste-recycling endpoint, complete in the server-rendered HTML. The category SHALL be live across the site: it has a home card, a sitemap entry, no `noindex`, a skeleton for pending navigations, a live meta description and the page title `Waste Generation & Recycling by Country`.

#### Scenario: Live category

- **WHEN** `/waste-recycling/` is requested without JavaScript
- **THEN** the HTML contains the key figures before the footer and no "coming soon" text
- **AND** the page has no `robots` meta tag and appears in the sitemap and on the home

### Requirement: Waste and recycling page metadata

`generateMetadata` for `waste-recycling` SHALL use the keyword-bearing title "Waste Generation & Recycling by Country" and a description of the live content, with the canonical URL `{siteUrl}/waste-recycling/` and matching Open Graph and Twitter tags. The `<h1>` SHALL remain "Waste & Recycling".

#### Scenario: Title and description

- **WHEN** `/waste-recycling/` is requested
- **THEN** `<title>` is "Waste Generation & Recycling by Country | eco-metrics earth" (59 characters)
- **AND** the meta description is "Municipal waste by country: how much each generates per person, how much is recycled, composted or dumped, and projections to 2050. Data from the World Bank."
- **AND** `og:title` and `twitter:title` are "Waste Generation & Recycling by Country" and the `<h1>` is "Waste & Recycling"

### Requirement: Key figures

The page SHALL server-render as text the world's municipal waste generated in 2022 (in billion tonnes and kg per person per day), its projection for 2050, and the world recycling summary, worded so that it applies only to the countries that report recycling, with their number and share of the world's population.

#### Scenario: Key figures text

- **WHEN** the page is rendered
- **THEN** it states about 2.33 billion tonnes and 0.80 kg per person per day in 2022 and about 3.49 billion tonnes in 2050
- **AND** it states about 18 % recycled among the 130 countries that report it, home to about 46 % of the world's population

### Requirement: World map with a measure selector

The page SHALL show a world map coloring each country by one of four measures chosen in a selector: share recycled (default), share recycled or composted, share uncollected, and waste per person per day in 2022. A country whose measure is not reported SHALL show as no data, never as 0. A country's tooltip SHALL include the data year, or "2022 estimate" for waste per person.

#### Scenario: Default measure

- **WHEN** the page loads
- **THEN** the map shows the share recycled and its legend in percent
- **AND** China, which does not report recycling, shows as no data

### Requirement: Partly reported measure

Share recycled or composted SHALL be the sum of the reported parts, shown when at least one part is reported, and SHALL name the part that is not reported in the tooltip and the table.

#### Scenario: Partly reported measure

- **WHEN** the visitor selects "Recycled or composted" and reads Brazil
- **THEN** it shows Brazil's recycling share and states that composting is not reported

#### Scenario: Switching measure

- **WHEN** the visitor selects "Waste per person"
- **THEN** the map shows kg per person per day in 2022, with every country that has a region on the map colored (the Channel Islands have none: they are only in the table and the bars)

### Requirement: Map ramps follow the polarity of the measure

The two recycling measures (share recycled, share recycled or composted) SHALL be colored with a good-is-high sequential ramp (greens), so the best recyclers are not painted in an alarm color. Share uncollected and waste per person SHALL use the heat ramp. The legend SHALL use the same ramp as the map.

#### Scenario: Recycling measures use the green ramp

- **WHEN** the visitor selects "Recycled" or "Recycled or composted"
- **THEN** the map classes and the legend swatches use the green ramp

#### Scenario: Other measures use the heat ramp

- **WHEN** the visitor selects "Uncollected" or "Per person"
- **THEN** the map classes and the legend swatches use the heat ramp

### Requirement: Ranked, sortable table sharing the selection with the map

The country table SHALL show a competition rank, sortable value headers with `aria-sort` (sorted by the selected measure, highest first, until a header is pressed) and countries without the sorted measure last and unranked. A country that has a value for the selected measure SHALL be selectable from the table or from the map, and the selection SHALL be shown on both.

#### Scenario: Sorting by a column

- **WHEN** the visitor presses the "Per person" header
- **THEN** the table is sorted by it, highest first, and its header has `aria-sort="descending"`

#### Scenario: Selecting a country

- **WHEN** the visitor selects Germany in the table
- **THEN** Germany is outlined on the map and its row is marked as selected

### Requirement: Country table below the map

Below the map the page SHALL offer a collapsed table of every country with the four measures and their data years, with a search that filters by country name, and sorting by the selected measure, countries without the measure last. Each country that has a flag SHALL show it beside its name; one without a flag (the Channel Islands) SHALL show none. The table SHALL be the text equivalent of the map: every value and every "not reported" note on the map is in it.

#### Scenario: Searching the table

- **WHEN** the visitor opens the table and types "arg"
- **THEN** only Argentina is listed, with its values or "—" where there is no data

### Requirement: What happens to the waste, compared across countries

The page SHALL show horizontal stacked bars of the eight treatment groups, one bar per selected country, each summing to 100 %, with a semantic palette that tells recovery, incineration, landfills and mismanagement apart. A group that is not reported SHALL take no space and SHALL be named as not reported in the tooltip and the table under the chart. The five most populous countries with treatment data SHALL be preselected, and a country search SHALL add and remove countries.

#### Scenario: Default comparison

- **WHEN** the page loads
- **THEN** the bars show CHN, IND, USA, IDN, BRA (by ISO code), each bar summing to 100 %
- **AND** India's tooltip names recycling as not reported

#### Scenario: Adding a country

- **GIVEN** the five default countries are selected
- **WHEN** the visitor adds Germany with the country search
- **THEN** a bar for Germany appears with recycling at about 47 %

### Requirement: Comparison is limited to ten countries and stays readable

The comparison SHALL hold at most ten countries at a time. At the maximum the search SHALL be unavailable (focusable but read-only, `aria-disabled="true"`, its list never opening) and SHALL state the limit in the field itself with a short placeholder ("Limit of 10 reached"), with the full sentence announced to assistive technology (not by colour alone). The country chips SHALL be compact while each remove button keeps a 44 px touch target. The bar charts SHALL be as tall as the number of bars asks for, with a placeholder of the same height shaped like stacked bars, and country names SHALL fit beside the bars.

#### Scenario: Selection limit

- **GIVEN** ten countries are selected
- **WHEN** the visitor focuses the search and types
- **THEN** the field is `aria-disabled="true"` and read-only, its placeholder reads "Limit of 10 reached", no list opens and no country is added
- **AND** assistive technology is told "Comparing 10 countries. Up to 10 countries. Remove one to add another."
- **AND** removing a country makes the search available again

### Requirement: What the waste is made of

The page SHALL show stacked bars of the six material groups for the same selected countries, each summing to 100 %, with a table under the chart and not-reported groups handled as in the treatment bars. A selected country without composition data SHALL be listed as having no data rather than omitted silently.

#### Scenario: Composition bars

- **WHEN** the page loads
- **THEN** a composition bar is shown for each default country that has composition data

### Requirement: Projected waste generation

The page SHALL chart municipal waste generated in 2022, 2030, 2040 and 2050 for the world (default) or for a country chosen with a country search, stating that 2030 to 2050 are World Bank projections. The value axis SHALL follow the data (padded, not forced to start at zero) with its labels visible, so the line is readable, and the table under the chart SHALL list the exact values.

#### Scenario: World projection

- **WHEN** the page loads
- **THEN** the projection chart shows the world from about 2.33 to about 3.49 billion tonnes

### Requirement: Attribution and structured data

The page SHALL credit the World Bank What a Waste 3.0 dataset with its license `CC BY 4.0`, a link to it and its last-update date, and SHALL embed one schema.org `Dataset` built with the generic builder.

#### Scenario: Attribution and JSON-LD

- **WHEN** the page is rendered
- **THEN** it shows the World Bank, `CC BY 4.0` and the update date
- **AND** it embeds one `Dataset` whose creator is the World Bank

### Requirement: Accessibility of the waste and recycling page

The page SHALL pass the axe audit with no critical or serious violations in both themes, and every chart SHALL have a text equivalent (the country table, or a table under the chart).

#### Scenario: Accessibility audit

- **WHEN** the E2E accessibility spec audits `/waste-recycling/` in the light and dark themes
- **THEN** it reports no critical or serious violations

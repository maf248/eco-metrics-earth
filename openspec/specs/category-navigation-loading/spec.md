# category-navigation-loading Specification

## Purpose

Defines what a visitor sees, and when, on direct visits and client navigations between category pages, so that known content is never hidden behind a loading state.

## Requirements

### Requirement: Direct visits to category pages deliver complete HTML

A direct request for a category page SHALL return HTML whose visible document already holds the heading, the server-rendered content and the structured data. It SHALL NOT contain a loading fallback, and that content SHALL NOT sit inside a hidden element awaiting a script.

#### Scenario: Provider-backed page from cache

- **GIVEN** `/co2-emissions/` is cached
- **WHEN** it is requested without executing JavaScript
- **THEN** the `<h1>`, the intro, the key figures, the data tables and the Dataset JSON-LD are present outside any hidden element
- **AND** the document has no `aria-busy="true"` element and exactly one `<main id="main-content">`

#### Scenario: Placeholder page

- **WHEN** `/ocean-health/` is requested without executing JavaScript
- **THEN** the `<h1>` and the "coming soon" text are present outside any hidden element

#### Scenario: Source order follows reading order

- **WHEN** the HTML of a cached category page is read in source order
- **THEN** `<main>` and its content come before the `<footer>`

### Requirement: Category header appears immediately on client navigation

On a client navigation to a category, from any route, the icon and `<h1>` of the destination SHALL appear as soon as the link is followed, from shared configuration, without waiting for the network and without a placeholder. Navigation state SHALL point at the destination from that moment.

#### Scenario: Slow data does not delay the header

- **GIVEN** a user on `/air-quality/` and a destination whose data takes seconds to arrive
- **WHEN** the user follows the link to `/co2-emissions/`
- **THEN** the "CO2 Emissions" heading and its icon are shown before the data arrives

#### Scenario: Header has no skeleton

- **WHEN** any client navigation to a category is in progress
- **THEN** no skeleton covers the icon or the heading

#### Scenario: Navigating from a page that is not a category

- **GIVEN** a user on `/` and a destination whose data takes seconds to arrive
- **WHEN** the user follows the link to `/water-footprint/`
- **THEN** the heading of the destination is shown before the data arrives

#### Scenario: Destination opens at the top

- **GIVEN** a user scrolled down a page
- **WHEN** the user follows a link to a category
- **THEN** the destination's header is shown at the top of the page, without smooth scrolling

#### Scenario: Pending link is marked active

- **WHEN** a client navigation is in progress
- **THEN** the navigation highlights the link of the destination

### Requirement: Skeletons are limited to pending regions

A skeleton SHALL be shown only for a region whose content is not yet available: data in flight or a client-rendered chart. Content already available SHALL be rendered instead of a skeleton, and categories without live data SHALL never show one.

#### Scenario: Navigating to a provider-backed category without cached data

- **WHEN** the destination's data is not yet available on the client
- **THEN** skeletons occupy the data regions below the header
- **AND** they are replaced by the content when it arrives

#### Scenario: Navigating to a placeholder category

- **WHEN** a user navigates to a category without live data
- **THEN** no skeleton is shown

#### Scenario: Charts keep their skeleton

- **WHEN** a provider-backed page renders and its chart has not loaded
- **THEN** only the chart area shows a same-height skeleton while the rest of the content is visible

#### Scenario: Pending regions are announced

- **WHEN** a data region shows skeletons
- **THEN** `<main>` is marked busy for assistive technology and the skeleton shapes are hidden from it

### Requirement: Content does not shift when data arrives

The skeleton of a data region SHALL repeat the layout of the content it stands for down to the first chart or list, with its text wrapping like the real text, so the replacement does not move what the visitor sees by a visible amount.

#### Scenario: First chart or list keeps its position

- **WHEN** a category page replaces its skeletons at any supported viewport width
- **THEN** the top of its first chart or list stays within one line of text of the skeleton's

#### Scenario: Replacing skeletons

- **WHEN** content replaces the skeletons of a category at any supported viewport
- **THEN** the layout shift attributable to the swap stays within the "good" Cumulative Layout Shift threshold of 0.1

### Requirement: The footer stays below the content area during navigation

The content area SHALL keep its minimum height at every moment of a navigation, so the footer is never drawn at the top of the viewport or above page content.

#### Scenario: Pending navigation

- **WHEN** a client navigation to any route is in progress
- **THEN** the top edge of the footer is at or below the bottom edge of the viewport for a page shorter than it

### Requirement: Navigation has proportionate feedback

Category changes SHALL use a short crossfade of the content area. A thin progress indicator SHALL appear only when a navigation lasts longer than about 200 ms, and disappear when it completes. Neither SHALL block interaction with the navigation.

#### Scenario: Fixed navigation stays above the crossfade

- **WHEN** a crossfade is playing on any viewport
- **THEN** the page content passes behind the fixed navigation, header and theme toggle

#### Scenario: Fast navigation

- **WHEN** a navigation completes in under 200 ms
- **THEN** no progress indicator is shown

#### Scenario: Slow navigation

- **WHEN** a navigation takes longer than 200 ms
- **THEN** the progress indicator is visible until the navigation completes

#### Scenario: Reduced motion

- **GIVEN** a user with `prefers-reduced-motion: reduce`
- **WHEN** a navigation happens
- **THEN** no crossfade or animated movement is played

#### Scenario: Browser without view transitions

- **GIVEN** a browser without the View Transitions API
- **WHEN** a navigation happens
- **THEN** the navigation works normally without the crossfade

### Requirement: Prefetching stays within budget

Default prefetching SHALL NOT download the full data payload of every provider-backed category on each page view. The chart code MAY be requested once the user aims at a link whose page draws a chart.

#### Scenario: Idle page view

- **GIVEN** a page with all navigation links visible and no user interaction
- **WHEN** default prefetching finishes
- **THEN** no full provider-backed page payload has been downloaded

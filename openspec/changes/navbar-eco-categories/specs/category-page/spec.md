## ADDED Requirements

### Requirement: Display the section title for a valid eco-category slug
The `[category]` page SHALL read the `category` route param and render the human-readable title using `slugToTitle`.

#### Scenario: Valid slug renders correct heading
- **WHEN** the route is `/ocean-health`
- **THEN** the page renders an `<h1>` containing `'Ocean Health'`

#### Scenario: Another valid slug renders correct heading
- **WHEN** the route is `/co2-emissions`
- **THEN** the page renders an `<h1>` containing `'Co2 Emissions'`

### Requirement: Page accepts category as a route parameter
The `[category]` page component SHALL accept `params.category` as its input and derive the title from it.

#### Scenario: params.category is forwarded to slugToTitle
- **WHEN** the component receives `params: { category: 'endangered-species' }`
- **THEN** the rendered heading text is `'Endangered Species'`

## ADDED Requirements

### Requirement: The divergent palette and the deforestation conventions are recorded

`docs/design-system.md` SHALL replace the pending "Divergent" subsection with the implemented palette: the seven `--chart-div-*` tokens with light and dark values, the class breaks of the forest change map (below -50, -50 to -25, -25 to -5, -5 to +5, +5 to +25, +25 to +50, +50 or more, in percent), the validation results and recorded exceptions, and the rule that polarity encoded by color is always doubled by signed legend text, signed tooltip and a signed table. It SHALL record, as implemented: the map without a year slider for a single comparison; the line chart whose value axis follows the data with a subtitle saying so (chart rule 12); the stacked bar chart of seven drivers on the semantic `treeCoverLoss` palette in a fixed order, with its validation numbers and exceptions; the unit scaling rule (million hectares on axes and key figures, thousand hectares in tables, never mixed inside one column); the ranking's percentage threshold (ranked only above a first-year minimum, others listed after with a dash in the rank); the `null` is not zero rule applied to blank drivers; and the rule that a page built on two sources of different measures says so and never combines them. The text that called the divergent palette pending SHALL be removed everywhere in the document.

#### Scenario: Nothing about the divergent palette is pending

- **WHEN** `docs/design-system.md` is searched for "Pending" near the divergent palette
- **THEN** the subsection documents the tokens, breaks, validation and exceptions and states nothing as pending

#### Scenario: Token table matches the declarations

- **WHEN** the divergent token table is compared with `globals.css`
- **THEN** every `--chart-div-*` token is listed with its light and dark values

#### Scenario: Deforestation conventions are findable

- **WHEN** a reader looks up how the deforestation page scales units, ranks percentages or labels the tree cover loss drivers
- **THEN** `docs/design-system.md` states each as decided

### Requirement: Deforestation data source docs, roadmap and READMEs are updated

`docs/data-sources/deforestation.md` SHALL list the sources in use (FAO FRA 2025 and the GFW tree cover loss by dominant driver, both through the OWID charts `forest-area-km`, `forest-area-as-share-of-land-area` and `tree-cover-loss-by-dominant-driver`), SHALL replace the statement that Global Forest Watch is non-commercial with the per-dataset facts (the WRI and Google DeepMind tree cover loss drivers dataset and the Hansen/UMD tree cover loss are CC BY 4.0; other GFW datasets may carry other licenses and must be checked individually), SHALL record why `annual-deforestation` and `annual-change-forest-area` are not used, and SHALL note that the share chart reaches back to the year 1000 and is restricted to 1990 onwards. `ROADMAP.md` SHALL no longer list deforestation among the pending categories, SHALL state 7 of 12 categories with real data, SHALL update the provider coverage matrix row of deforestation and the count of categories remaining, with no item IDs added. The Postman OWID collection SHALL include requests (CSV and metadata) for `forest-area-as-share-of-land-area` and `tree-cover-loss-by-dominant-driver`, and the existing `forest-area-km` requests SHALL keep working. `README.md`, `apps/web/README.md`, `apps/api/README.md`, `packages/shared/README.md`, the `AGENTS.md` structure tree and any list of live categories, providers or fixtures SHALL include the new module, shared types, components and fixtures; `CHANGELOG.md` SHALL be untouched.

#### Scenario: Licence statement is corrected

- **WHEN** `docs/data-sources/deforestation.md` and `docs/data-sources/reforestation.md` are read
- **THEN** neither states that Global Forest Watch data is non-commercial as a blanket rule, and both say licenses are per dataset

#### Scenario: Roadmap status

- **WHEN** `ROADMAP.md` is read
- **THEN** its status says 7 of 12 categories with real data, deforestation is not listed as a placeholder, and no `Pxx`, `Dxx` or `Ixx` ID is added

#### Scenario: Postman collection

- **WHEN** the OWID Postman collection is read
- **THEN** it has data and metadata requests for the two new slugs

#### Scenario: Other docs

- **WHEN** the READMEs, `AGENTS.md` and the fixtures README are read
- **THEN** every list of live categories, shared type files, API modules, web components and fixtures includes the deforestation additions and cross-links stay valid

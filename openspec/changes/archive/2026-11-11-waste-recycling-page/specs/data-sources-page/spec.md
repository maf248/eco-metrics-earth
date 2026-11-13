# Spec Delta

## ADDED Requirements

### Requirement: Publication license is shown next to it

A cited publication with a `license` SHALL show, after its entry count, "License" followed by the license name as an external link (`target="_blank"`, `rel="noopener noreferrer"`) to the license URL. A publication without `license` SHALL render as before.

#### Scenario: Publication with a license

- **GIVEN** a catalog with a publication whose `license` is `{ name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }`
- **WHEN** the page is rendered
- **THEN** the publication shows "License" and a link named `CC BY 4.0` to that URL

#### Scenario: Publication without a license

- **GIVEN** a publication with no `license`
- **WHEN** the page is rendered
- **THEN** no "License" text is shown for it

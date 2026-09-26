# skip-link-focus Specification

## Purpose

Defines the focusable main content landmark for skip-link navigation.

## Requirements

### Requirement: The main content landmark is programmatically focusable

The `<main>` element in pages that serve as the skip-link target SHALL have `tabIndex={-1}` and an `id` matching the skip-link `href` so that keyboard users can skip navigation.

#### Scenario: Skip-link moves focus to main content

- **WHEN** a keyboard user activates the skip-link (pressing Enter while the skip-link is focused)
- **THEN** focus moves to the `<main>` element
- **THEN** the `<main>` element is not added to the natural tab order (tabIndex is -1, not 0)

#### Scenario: Main element has the correct id

- **WHEN** the 404 page renders
- **THEN** the `<main>` element has `id="main-content"` (or matching the skip-link href anchor)
- **THEN** the `<main>` element has `tabIndex={-1}`

# Spec Delta

## MODIFIED Requirements

### Requirement: NavScrollContainer shows vertical scroll affordances on desktop

On desktop (`lg+`), `NavScrollContainer` SHALL show a top gradient affordance when the `<ul>` has scrolled down from its top (`scrollTop > 0`), and a bottom gradient affordance when there is more content below the visible area (`scrollTop < scrollHeight - clientHeight`). Both affordances SHALL fade from the nav surface color (the single `nav-surface` token that switches with the theme, the same token used by the existing horizontal affordances), SHALL be `aria-hidden="true"` and `pointer-events-none` (purely decorative), and SHALL be hidden on mobile/tablet via `hidden lg:block` (the inverse of the existing horizontal affordances' `lg:hidden`). The vertical affordance state SHALL be computed by extending the same scroll/resize-driven `update()` effect already used for the horizontal affordances — no additional listeners, dependencies, or observers.

#### Scenario: No vertical affordances when the list is not scrollable

- **GIVEN** the `<ul>`'s `scrollHeight` equals its `clientHeight` (no vertical overflow)
- **WHEN** the list renders
- **THEN** neither the top nor the bottom vertical gradient affordance is visible

#### Scenario: Bottom affordance shown when scrolled to the top of overflowing content

- **GIVEN** the `<ul>` has vertical overflow (`scrollHeight > clientHeight`)
- **WHEN** `scrollTop` is 0
- **THEN** the bottom gradient affordance is visible
- **AND** the top gradient affordance is not visible

#### Scenario: Both affordances shown when scrolled to the middle

- **GIVEN** the `<ul>` has vertical overflow
- **WHEN** `scrollTop` is greater than 0 and less than `scrollHeight - clientHeight`
- **THEN** both the top and bottom gradient affordances are visible

#### Scenario: Only top affordance shown when scrolled to the bottom

- **GIVEN** the `<ul>` has vertical overflow
- **WHEN** `scrollTop` equals `scrollHeight - clientHeight` (fully scrolled to the end)
- **THEN** the top gradient affordance is visible
- **AND** the bottom gradient affordance is not visible

# navscroll-scroll-tests Specification

## Purpose
TBD - created by archiving change configuration-and-tests. Update Purpose after archive.
## Requirements
### Requirement: NavScrollContainer tests cover scroll affordance visibility
The test file `apps/web/__tests__/components/NavScrollContainer.test.tsx` SHALL include test cases that simulate scroll state changes and assert that the left and right gradient affordances appear and disappear correctly.

#### Scenario: No affordances shown when content is not scrollable
- **WHEN** the container's scrollWidth equals its clientWidth (no overflow)
- **THEN** neither left nor right gradient affordance is visible

#### Scenario: Right affordance shown when scrolled to the start of overflowing content
- **WHEN** the container has overflowing content (`scrollWidth > clientWidth`) and `scrollLeft` is 0
- **THEN** the right gradient affordance is visible
- **THEN** the left gradient affordance is not visible

#### Scenario: Left affordance shown when scrolled past the start
- **WHEN** the container has overflowing content and `scrollLeft > 0` and has not reached the end
- **THEN** the left gradient affordance is visible

#### Scenario: Both affordances shown when scrolled to the middle
- **WHEN** the container has overflowing content and `scrollLeft > 0` and `scrollLeft < scrollWidth - clientWidth`
- **THEN** both left and right gradient affordances are visible

#### Scenario: Only left affordance shown when scrolled to the end
- **WHEN** `scrollLeft` equals `scrollWidth - clientWidth` (fully scrolled to the end)
- **THEN** the left gradient affordance is visible
- **THEN** the right gradient affordance is not visible

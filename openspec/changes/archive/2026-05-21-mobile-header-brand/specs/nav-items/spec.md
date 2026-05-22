## MODIFIED Requirements

### Requirement: Mobile layout content offset
The mobile content area SHALL clear both the fixed top header (`h-14`, 56px) and the fixed bottom nav (`h-20`, 80px). The root layout wrapper div SHALL use `pb-20` for bottom clearance (unchanged). Each page's `<main>` element SHALL use `pt-14` as top padding so content starts below the fixed header.

#### Scenario: Content clears the bottom nav
- **WHEN** a page is rendered on mobile
- **THEN** the bottom of the content area has at least 80px of padding so it is not obscured by the bottom nav bar

#### Scenario: Content clears the top header
- **WHEN** a page is rendered on mobile
- **THEN** the `<main>` element has `pt-14` so its content begins below the 56px fixed header

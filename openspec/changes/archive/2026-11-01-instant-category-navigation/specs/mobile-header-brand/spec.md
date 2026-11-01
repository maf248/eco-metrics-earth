# Spec Delta

## MODIFIED Requirements

### Requirement: Page content top offset accounts for the fixed header

All pages SHALL have a top padding of `pt-14` on their outermost content element so content is not obscured by the fixed header. The root layout wrapper SHALL add a comment noting this dependency.

#### Scenario: Content is not hidden under the header

- **WHEN** a page renders its main content
- **THEN** the top of the visible content area begins at or below 56px from the top of the viewport

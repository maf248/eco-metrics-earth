# Spec Delta

## MODIFIED Requirements

### Requirement: Mobile header visual style matches the nav palette

The header SHALL use the page surface token at 95% opacity with a backdrop blur for its background, the default border token for its bottom border, the accent token for the brand name text, and the `SiteLogoIcon` at `w-7 h-7`. Through the tokens this resolves to a near-opaque white header with a gray-200 border and emerald-700 brand text in light mode, and a near-opaque black header with a gray-800 border and emerald-400 brand text in dark mode.

#### Scenario: Header background matches nav

- **WHEN** the mobile header is rendered
- **THEN** it has a background from the page surface token at 95% opacity, consistent with the page behind it in the active theme
- **AND** in dark mode that background resolves to near-opaque black

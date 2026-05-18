# svg-icon-components Specification

## Purpose
TBD - created by archiving change perf-svg-icons. Update Purpose after archive.
## Requirements
### Requirement: Icon component library
`apps/web/src/components/icons/` SHALL contain one React SVG component per icon (13 total, one per `EcoCategory` slug plus `SiteLogoIcon` and `NotFoundIcon`).

Each component SHALL:
- Accept `React.SVGProps<SVGSVGElement>` as its props (spread onto the root `<svg>` element).
- Be a named export from `apps/web/src/components/icons/index.ts`.
- Use PascalCase naming: `<CategorySlug>Icon` (e.g., `AirQualityIcon`, `Co2EmissionsIcon`).

The `<svg>` root element in each component SHALL NOT include hardcoded `fill` or `stroke` colour values that would override CSS inheritance; colours SHALL use `currentColor` or be inherited.

#### Scenario: Icon renders as inline SVG
- **WHEN** an icon component is rendered in a React tree
- **THEN** the output is an `<svg>` element with no external `src` attribute

#### Scenario: Icon accepts className prop
- **WHEN** an icon component is rendered with a `className` prop
- **THEN** the `className` is applied to the root `<svg>` element

#### Scenario: Icon accepts aria-hidden prop
- **WHEN** an icon component is rendered with `aria-hidden={true}`
- **THEN** the root `<svg>` element has `aria-hidden="true"`

#### Scenario: All icons are exported from barrel index
- **WHEN** a module imports from `@/components/icons`
- **THEN** all 13 icon components are available as named exports


# nav-items Specification

## Purpose
TBD - created by archiving change perf-svg-icons. Update Purpose after archive.
## Requirements
### Requirement: NavItem icon field holds a React component
`apps/web/src/lib/navItems.ts` SHALL define the `NavItem` interface (or type) with an `icon` field of type `React.ComponentType<React.SVGProps<SVGSVGElement>>`, not `string`.

Each entry in the nav items array SHALL reference the corresponding icon component from `@/components/icons`.

`apps/web/src/components/NavLink.tsx` SHALL render the `icon` field as a JSX element (e.g., `<Icon className="..." aria-hidden />`) rather than using `<Image src={icon} />`.

#### Scenario: NavLink renders icon as inline SVG
- **WHEN** a `NavLink` component is rendered with a nav item
- **THEN** the icon appears as an `<svg>` element in the DOM, not an `<img>` element

#### Scenario: NavLink does not import next/image for icons
- **WHEN** the NavLink source file is inspected
- **THEN** there is no `import Image from 'next/image'` used for icon rendering

### Requirement: Mobile layout content offset
The mobile content area SHALL clear both the fixed top header (`h-14`, 56px) and the fixed bottom nav (`h-20`, 80px). The root layout wrapper div SHALL use `pb-20` for bottom clearance (unchanged). Each page's `<main>` element SHALL use `pt-14` as top padding so content starts below the fixed header.

#### Scenario: Content clears the bottom nav
- **WHEN** a page is rendered on mobile
- **THEN** the bottom of the content area has at least 80px of padding so it is not obscured by the bottom nav bar

#### Scenario: Content clears the top header
- **WHEN** a page is rendered on mobile
- **THEN** the `<main>` element has `pt-14` so its content begins below the 56px fixed header


## ADDED Requirements

### Requirement: NavItem icon field holds a React component
`apps/web/src/lib/navItems.tsx` SHALL define the `NavItem` interface (or type) with an `icon` field of type `React.ComponentType<React.SVGProps<SVGSVGElement>>`, not `string`.

Each entry in the nav items array SHALL reference the corresponding icon component from `@/components/icons`.

`apps/web/src/components/NavLink.tsx` SHALL render the `icon` field as a JSX element (e.g., `<Icon className="..." aria-hidden />`) rather than using `<Image src={icon} />`.

#### Scenario: NavLink renders icon as inline SVG
- **WHEN** a `NavLink` component is rendered with a nav item
- **THEN** the icon appears as an `<svg>` element in the DOM, not an `<img>` element

#### Scenario: NavLink does not import next/image for icons
- **WHEN** the NavLink source file is inspected
- **THEN** there is no `import Image from 'next/image'` used for icon rendering

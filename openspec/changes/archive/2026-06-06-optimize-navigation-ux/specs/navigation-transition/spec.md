## ADDED Requirements

### Requirement: Content transition wrapper exists
The system SHALL include a `ContentTransition` client component that wraps the `{children}` content area in `layout.tsx` and applies a visual transition effect during client-side navigation.

#### Scenario: Content wrapper renders children normally when idle
- **WHEN** no navigation is in progress
- **THEN** the content wrapper SHALL render `{children}` at full opacity
- **AND** the wrapper SHALL NOT interfere with the layout or styling of child components

#### Scenario: Content wrapper reduces opacity during navigation
- **WHEN** a client-side route transition begins
- **THEN** the existing page content SHALL briefly reduce opacity to 0.7
- **AND** the opacity transition SHALL animate over 150ms via CSS transition

#### Scenario: Content wrapper restores opacity after navigation
- **WHEN** the route transition completes
- **THEN** the new page content SHALL render at full opacity (1)
- **AND** the opacity transition SHALL animate back over 150ms

### Requirement: ContentTransition is a client component
The `ContentTransition` component SHALL be marked with `'use client'` directive and SHALL use the `usePathname` and `useTransition` hooks from React 19.

#### Scenario: Component detects route changes
- **WHEN** `usePathname()` returns a new value different from the previous render
- **THEN** the component SHALL update its internal state to track the new pathname
- **AND** `useTransition` SHALL report `isPending` during the Suspense boundary resolution

### Requirement: ContentTransition wraps children in layout.tsx
The `layout.tsx` file SHALL import and render `ContentTransition` around the `{children}` content area inside the existing offset `<div>`.

#### Scenario: Layout renders with transition wrapper
- **WHEN** the root layout renders
- **THEN** `{children}` SHALL be wrapped inside `<ContentTransition>`
- **AND** the existing `pb-20 lg:pb-0 lg:pl-68` offset div SHALL remain as the outermost content wrapper

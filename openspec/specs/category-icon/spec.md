# category-icon Specification

## Purpose

TBD - created by archiving change perf-svg-icons. Update Purpose after archive.

## Requirements

### Requirement: Category icon map returns React components

`apps/web/src/lib/categoryIcon.ts` SHALL export a `categoryIconMap` (or equivalent) that maps each `EcoCategory` slug plus the keys `SITE_LOGO` and `NOT_FOUND` to a `React.ComponentType<React.SVGProps<SVGSVGElement>>`.

The module SHALL NOT export SVG path strings for the mapped keys.

#### Scenario: Valid category key returns a component

- **WHEN** `categoryIconMap['air-quality']` is accessed
- **THEN** the value is a React component (a function or class, not a string)

#### Scenario: SITE_LOGO key returns a component

- **WHEN** `categoryIconMap['SITE_LOGO']` is accessed
- **THEN** the value is a React component

#### Scenario: NOT_FOUND key returns a component

- **WHEN** `categoryIconMap['NOT_FOUND']` is accessed
- **THEN** the value is a React component

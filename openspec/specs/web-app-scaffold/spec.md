# web-app-scaffold Specification

## Purpose

Defines the initial Next.js App Router scaffold with layout, Tailwind dark mode, folder structure, and smoke test.

## Requirements

### Requirement: Next.js App Router with base layout

The `web` app SHALL use Next.js with App Router. A root layout (`app/layout.tsx`) SHALL exist with semantic HTML structure, base metadata, and dark mode support via a CSS class on `<html>`.

#### Scenario: Home page responds with HTML

- **WHEN** accessing `http://localhost:3000`
- **THEN** the server returns HTML with status 200 and basic site metadata

#### Scenario: Dark mode enabled by default

- **WHEN** any page renders
- **THEN** the `<html>` element has the `dark` class applied by default

### Requirement: Tailwind CSS configured with dark mode

Tailwind CSS SHALL be configured with the `class` strategy for dark mode. The `tailwind.config.ts` file SHALL include the paths of all `web` app files.

#### Scenario: Dark mode class works in components

- **WHEN** the `<html>` element has the `dark` class
- **THEN** Tailwind `dark:` classes apply their styles correctly

### Requirement: Frontend base folder structure

The `web` app SHALL have the following folder structure inside `src/`:

- `app/` — routes and layouts (App Router)
- `components/` — reusable components
- `lib/` — utilities and helpers
- `types/` — frontend-local TypeScript types

#### Scenario: Imports between folders work

- **WHEN** a component imports from `@/lib/utils`
- **THEN** the path alias resolves correctly without errors

### Requirement: Frontend smoke test

At least one smoke test SHALL exist that verifies the root layout component renders without errors.

#### Scenario: Smoke test passes

- **WHEN** `nx test web` is run
- **THEN** the smoke test passes and Jest returns exit code 0

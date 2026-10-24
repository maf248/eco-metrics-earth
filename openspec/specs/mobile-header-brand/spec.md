# mobile-header-brand Specification

## Purpose

Mobile-only fixed top header providing site brand identity and a home link. Renders a terminal-style animated brand name with typewriter effect and [↵] affordance. Visible only on mobile (lg:hidden); desktop uses the sidebar brand.

## Requirements

### Requirement: Mobile header renders as a semantic banner landmark

The system SHALL render a `<header>` element with `aria-label="Site header"` that is visible only on viewports narrower than the `lg` breakpoint (1024px) and hidden on desktop via `lg:hidden`.

#### Scenario: Header is visible on mobile

- **WHEN** the viewport width is less than 1024px
- **THEN** the `<header>` element is visible and present in the accessibility tree

#### Scenario: Header is hidden on desktop

- **WHEN** the viewport width is 1024px or greater
- **THEN** the `<header>` element is not visible (CSS hidden, not removed from DOM)

### Requirement: Mobile header contains an accessible home link

The header SHALL contain a single `<a>` (Next.js `<Link>`) with `href="/"` and `aria-label="eco-metrics earth — go to home"` that navigates the user to the home page. The link SHALL be the entire tappable surface of the header.

#### Scenario: Link navigates to home

- **WHEN** a user taps anywhere in the mobile header
- **THEN** the browser navigates to `/`

#### Scenario: Link has correct accessible name

- **WHEN** a screen reader focuses the link
- **THEN** it announces "eco-metrics earth — go to home" (from `aria-label`), not the raw text content including the cursor character

#### Scenario: Link has correct href

- **WHEN** the header link is rendered
- **THEN** its `href` attribute is `/`

### Requirement: Mobile header displays the site logo

The header SHALL render the `SiteLogoIcon` SVG component with `aria-hidden="true"` so it is excluded from the accessibility tree (the link's `aria-label` provides the accessible name).

#### Scenario: Logo is rendered as SVG

- **WHEN** the mobile header is rendered
- **THEN** an SVG element is present inside the header

#### Scenario: Logo is aria-hidden

- **WHEN** the mobile header is rendered
- **THEN** the logo SVG has `aria-hidden="true"` so screen readers skip it

### Requirement: Mobile header displays terminal-style brand text

The header SHALL render the brand text `~ eco-metrics.earth` in a monospace font with a typewriter animation that reveals characters one by one on mount (~60ms per character). Upon completion, a `[↵]` indicator SHALL fade in with `transition-opacity duration-500`. Both the brand text container and the `[↵]` span SHALL be `aria-hidden="true"`. If `prefers-reduced-motion: reduce` is active, the full text SHALL be displayed immediately with no animation and `[↵]` SHALL be visible from the start.

#### Scenario: Brand text types out on mount

- **WHEN** the mobile header mounts with no reduced-motion preference
- **THEN** the text starts empty and characters appear one by one until the full string `~ eco-metrics.earth` is shown

#### Scenario: Enter affordance appears after typing completes

- **WHEN** the typewriter animation finishes
- **THEN** a `[↵]` span becomes visible (opacity transitions from 0 to 1)

#### Scenario: Brand text and enter affordance are aria-hidden

- **WHEN** a screen reader traverses the header
- **THEN** neither the brand text nor the `[↵]` span is announced

#### Scenario: No animation when reduced motion is preferred

- **WHEN** the user has set `prefers-reduced-motion: reduce`
- **THEN** the full brand text is shown immediately and `[↵]` is visible without any transition

### Requirement: Blinking cursor animation is CSS-only and respects reduced motion

The cursor `▋` SHALL animate with a realistic terminal blink using a CSS `@keyframes` animation with `animation-timing-function: step-end`. The animation SHALL only run when `prefers-reduced-motion: no-preference` is set. When the user prefers reduced motion, the cursor SHALL appear as a static visible character.

#### Scenario: Cursor blinks on standard motion preference

- **WHEN** the user has not set `prefers-reduced-motion: reduce`
- **THEN** the cursor element has an animation applied that cycles between visible and hidden states abruptly (step-end)

#### Scenario: Cursor is static when reduced motion is preferred

- **WHEN** the user has set `prefers-reduced-motion: reduce`
- **THEN** the cursor element has no animation and remains fully visible

### Requirement: Mobile header is fixed to the top of the viewport

The header SHALL be `position: fixed`, anchored to `top: 0`, spanning the full viewport width, with `height: 56px` (`h-14`), and a `z-index` above page content but below modals.

#### Scenario: Header stays at top on scroll

- **WHEN** the user scrolls the page content
- **THEN** the header remains fixed at the top of the viewport

### Requirement: Mobile header visual style matches the nav palette

The header SHALL use the page surface token at 95% opacity with a backdrop blur for its background, the default border token for its bottom border, the accent token for the brand name text, and the `SiteLogoIcon` at `w-7 h-7`. Through the tokens this resolves to a near-opaque white header with a gray-200 border and emerald-700 brand text in light mode, and a near-opaque black header with a gray-800 border and emerald-400 brand text in dark mode.

#### Scenario: Header background matches nav

- **WHEN** the mobile header is rendered
- **THEN** it has a background from the page surface token at 95% opacity, consistent with the page behind it in the active theme
- **AND** in dark mode that background resolves to near-opaque black

### Requirement: Page content top offset accounts for the fixed header

All pages SHALL have a top padding of `pt-14` on their `<main>` element so content is not obscured by the fixed header. The root layout wrapper SHALL add a comment noting this dependency.

#### Scenario: Content is not hidden under the header

- **WHEN** a page renders its main content
- **THEN** the top of the visible content area begins at or below 56px from the top of the viewport

# Spec Delta

## MODIFIED Requirements

### Requirement: Presentation facts live in the design system doc

The presentation-relevant facts about the codebase SHALL be recorded in `docs/design-system.md` as the single source of truth, and SHALL NOT be duplicated into agent definitions or component comments. Every copy is a place that can drift out of sync with the codebase silently, while still reading as authoritative.

The facts recorded in `docs/design-system.md` SHALL include:

- `apps/web` uses Next.js 16 (App Router), React 19, and Tailwind CSS v4.
- Dark mode is class-based: `apps/web/src/app/globals.css` declares `@custom-variant dark (&:where(.dark, .dark *))`, and `ThemeProvider`/a blocking inline script toggle the `dark` class on `<html>`.
- Theming is expressed through semantic color tokens (see the `design-tokens` capability): raw custom properties on `:root`, overridden under `.dark`, and exposed through `@theme inline`, so a single utility per role covers both themes. The doc lists every token with its role and light/dark values, plus the documented `dark:` exceptions.
- Eco-category icon components in `apps/web/src/components/icons/` are intentionally multicolor with hardcoded fills; per the `light-mode-styling` capability, they MUST NOT be recolored or tinted per theme. Contrast fixes must add separation without altering the SVG's own colors.
- The project's SEO/accessibility baseline: semantic HTML, descriptive titles/meta descriptions, trailing-slash canonical URLs, and accessible markup verified via `@axe-core/playwright` E2E coverage.

#### Scenario: Design system doc records the current theming mechanism

- **GIVEN** `docs/design-system.md`
- **WHEN** its Theme Rules section is read
- **THEN** it describes theming as semantic color tokens declared in `globals.css` that switch value under `.dark`, consumed as single utilities
- **AND** it contains a token table (role, light value, dark value) and the list of remaining `dark:` exceptions

#### Scenario: Design system doc preserves the icon color constraint

- **GIVEN** `docs/design-system.md`
- **WHEN** its guidance on category icons is read
- **THEN** it states that eco-category icons keep their hardcoded multicolor fills and that contrast fixes must not recolor them

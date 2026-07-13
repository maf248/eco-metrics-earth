## Context

The `apps/web` Next.js app is currently hardcoded to dark mode. The `<html>` element has a static `className="dark"` and all components use fixed dark-themed color classes (`bg-black`, `text-white`, `bg-white/10`, etc.). Tailwind CSS v4's `@custom-variant dark` directive is already configured in `globals.css`, which maps the `dark:` prefix to `&:where(.dark, .dark *)`. No theming infrastructure (provider, context, persistence) exists.

The user wants a light/dark theme toggle (top-right) and the entire frontend adapted for both modes.

## Goals / Non-Goals

**Goals:**
- Provide a `ThemeProvider` that manages theme state via React Context and toggles the `dark` class on `<html>`.
- Persist the user's theme choice in `localStorage` so it survives page reloads.
- Respect `prefers-color-scheme` as the default when no stored preference exists.
- Apply the resolved theme before first paint via a blocking inline script to avoid any flash of the wrong theme.
- Create a `ThemeToggle` component (fixed top-right) — a single lamp-icon button that toggles the theme.
- Adapt all existing components and pages to render correctly in both light and dark modes using Tailwind `dark:` variant classes.
- Update tests to cover both theme modes.

**Non-Goals:**
- No theme transition animations beyond instant toggle.
- No additional theme variants (high-contrast, sepia, custom colors).
- No SSR/server theme detection — the theme is resolved client-side, but a blocking inline script in `<head>` applies it before first paint so there is no visible flash.
- No external theming library (e.g., `next-themes`).
- No changes to the emerald accent color or brand identity.

## Decisions

### 1. Theme storage: React Context + localStorage (no external library)

**Choice:** A custom `ThemeProvider` component using `useState` + `useContext` + `localStorage` + `matchMedia`.

**Rationale:** The requirements are simple (two possible values: `light` / `dark`). Adding `next-themes` would bring extra dependency for problems we do not have (SSR flash prevention, `class` vs `data-*` attribute strategies). The project convention is to avoid dependencies until complexity demands them (see `AGENTS.md` State Management section).

**Alternatives considered:**
- `next-themes`: Popular, handles SSR flash, but adds an external dependency for a simple binary toggle. Over-engineered for current needs.
- CSS-only `prefers-color-scheme`: Cannot be toggled by the user — no manual override. Rejected.
- URL-based theme (`?theme=light`): Unusual for persistent preferences, pollutes URLs. Rejected.

### 2. Theme persistence key: `eco-metrics-theme`

**Choice:** `localStorage` key `eco-metrics-theme` storing `"light"` or `"dark"`.

**Rationale:** Namespaced to avoid collisions with other apps on the same origin. Simple string values.

### 3. Tailwind strategy: `dark:` variant (already configured)

**Choice:** Continue using the existing `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`. All light-mode styles are the base classes; dark-mode overrides use the `dark:` prefix.

**Rationale:** Already configured, zero setup cost. Tailwind v4's custom variant supports nested `dark *` matching, so components deep in the tree work correctly.

**Alternatives considered:**
- `data-theme` attribute: Would require changing the existing `@custom-variant` directive. No benefit over the current `class` strategy.
- CSS custom properties (`--color-bg`, etc.): More flexible for future theme variants but overkill for a simple binary toggle.

### 4. Theme control: single fixed top-right toggle button

**Choice:** A fixed-position lamp-icon button at the top-right of the viewport (`fixed top-2 right-4 z-50 lg:top-4`). Clicking it calls `toggleTheme()` directly — there is no dropdown or settings menu.

**Rationale:** The only setting today is the light/dark toggle, so a dropdown/menu wrapper adds interaction cost (open, click-away, Escape, focus trap) for zero current benefit. A direct one-tap button is simpler, more discoverable, and fully accessible via a native `<button>`. A dropdown-based settings menu can be reintroduced later if and when there is more than one setting to house.

**Alternatives considered:**
- Settings dropdown menu (gear trigger + panel): This was the original plan, but it was over-engineered for a single toggle. Deferred until a second setting exists.
- Navbar item: Would clutter the navigation with non-navigation functionality.
- Bottom-right floating action button: Less discoverable on desktop. Top-right is a standard pattern.

### 5. Icons: Custom SVG component (following existing pattern)

**Choice:** A new `LightBulbIcon` (lamp) React component in `apps/web/src/components/icons/`, using `currentColor` plus `dark:` variant classes so its lit/dimmed appearance follows the theme.

**Rationale:** The project already has custom SVG icon components following the same pattern. Consistency over adding an icon library. No gear/`SettingsIcon` is needed since there is no settings menu — only the single lamp button.

### 6. Component adaptation approach: `dark:` variant classes

**Choice:** For each hardcoded dark class, add the corresponding light class as the base and move the dark class behind `dark:`.

**Mapping:**
| Current (dark-only) | Light mode (base) | Dark mode (`dark:` override) |
|---|---|---|
| `bg-black` | `bg-white` | `dark:bg-black` |
| `text-white` | `text-gray-900` | `dark:text-white` |
| `text-gray-400` | `text-gray-600` | `dark:text-gray-400` |
| `bg-white/10` | `bg-gray-100` | `dark:bg-white/10` |
| `bg-white/5` | `bg-gray-50` | `dark:bg-white/5` |
| `bg-white/15` | `bg-gray-200` | `dark:bg-white/15` |
| `bg-black/95` | `bg-white/95` | `dark:bg-black/95` |
| `border-gray-800` | `border-gray-200` | `dark:border-gray-800` |
| `ring-offset-black` | `ring-offset-white` | `dark:ring-offset-black` |
| `outline-white/20` | `outline-gray-300` | `dark:outline-white/20` |

**Rationale:** This mapping preserves the visual hierarchy: light backgrounds become dark, dark text becomes light, and semi-transparent overlays map to opaque gray tones in light mode. The emerald accent color is not inverted (it works on both white and black backgrounds).

## Risks / Trade-offs

- **[Resolved] Flash of incorrect theme on first load** → A blocking inline `<script>` in `<head>` reads the stored preference (falling back to `prefers-color-scheme`) and removes the `dark` class before first paint, so there is no flash even before React hydrates.

- **[Risk] `localStorage` is not available in all contexts** → **Mitigation:** Wrap `localStorage` access in try/catch. On failure (e.g., private browsing in some older browsers), fall back to `prefers-color-scheme` only, without persistence.

- **[Risk] Snapshot tests will break** → **Mitigation:** Update snapshots intentionally after verifying the new output is correct. Component tests that render without a `ThemeProvider` wrapper will need the provider added to their test wrappers.

- **[Decision] Eco-category icon colors stay hardcoded** → The existing eco-category SVG icons use specific brand colors per category (greens, blues, reds) that are part of each category's visual identity and read correctly on both light and dark backgrounds. They are intentionally left multi-colored. Only the new `LightBulbIcon` UI control uses `currentColor` so its lit/dimmed state can follow the theme.

## Open Questions

_None — all design decisions have been resolved._

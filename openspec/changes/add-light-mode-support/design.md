## Context

The `apps/web` Next.js app is currently hardcoded to dark mode. The `<html>` element has a static `className="dark"` and all components use fixed dark-themed color classes (`bg-black`, `text-white`, `bg-white/10`, etc.). Tailwind CSS v4's `@custom-variant dark` directive is already configured in `globals.css`, which maps the `dark:` prefix to `&:where(.dark, .dark *)`. No theming infrastructure (provider, context, persistence) exists.

The user wants a settings menu (top-right) with a light/dark toggle, and the entire frontend adapted for both modes.

## Goals / Non-Goals

**Goals:**
- Provide a `ThemeProvider` that manages theme state via React Context and toggles the `dark` class on `<html>`.
- Persist the user's theme choice in `localStorage` so it survives page reloads.
- Respect `prefers-color-scheme` as the default when no stored preference exists.
- Create a `SettingsMenu` component (fixed top-right) with a dropdown containing the theme toggle (lamp icon), structured to accept future settings items.
- Adapt all existing components and pages to render correctly in both light and dark modes using Tailwind `dark:` variant classes.
- Update tests to cover both theme modes.

**Non-Goals:**
- No theme transition animations beyond instant toggle.
- No additional theme variants (high-contrast, sepia, custom colors).
- No SSR theme detection — a brief client-side flash before theme application is acceptable.
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

### 4. Settings menu: fixed top-right button with portal dropdown

**Choice:** A fixed-position gear icon button at the top-right of the viewport (`fixed top-4 right-4 z-50`). Clicking toggles a dropdown panel containing the theme toggle (lamp icon). The dropdown closes on outside click (via a backdrop `div` or click-away listener) and on Escape key.

**Rationale:** Fixed positioning ensures the settings are always accessible regardless of scroll position. The dropdown pattern is familiar and extensible — future settings items can be added as additional rows in the dropdown without changing the trigger button.

**Alternatives considered:**
- Navbar item: Would clutter the navigation with non-navigation functionality. Settings belong in a separate UI region.
- Bottom-right floating action button: Less discoverable on desktop. Top-right is a standard pattern (Google, GitHub, etc.).
- Dialog/modal: Too heavy for a simple toggle. Dropdown is lighter and faster.

### 5. Icons: Custom SVG components (following existing pattern)

**Choice:** New `SettingsIcon` (gear/cog) and `LightBulbIcon` (lamp) as React components in `apps/web/src/components/icons/`.

**Rationale:** The project already has 14 custom SVG icon components following the same pattern. Consistency over adding an icon library.

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

- **[Risk] Brief flash of incorrect theme on first load** → **Mitigation:** Acceptable per Non-Goals. The theme applies on the client side immediately after React hydrates. In practice, this is ~100-200ms and barely noticeable. Can be addressed later with a blocking `<script>` in `<head>` if it becomes a complaint.

- **[Risk] `localStorage` is not available in all contexts** → **Mitigation:** Wrap `localStorage` access in try/catch. On failure (e.g., private browsing in some older browsers), fall back to `prefers-color-scheme` only, without persistence.

- **[Risk] Snapshot tests will break** → **Mitigation:** Update snapshots intentionally after verifying the new output is correct. Component tests that render without a `ThemeProvider` wrapper will need the provider added to their test wrappers.

- **[Risk] Icon colors in custom SVG components are hardcoded** → **Mitigation:** Update the 14 existing icon components to use `currentColor` for their fill/stroke so they inherit the text color from the parent. This is the idiomatic SVG approach and works with Tailwind's `text-*` classes.

## Open Questions

_None — all design decisions have been resolved._

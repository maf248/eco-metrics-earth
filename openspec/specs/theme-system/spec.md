# theme-system Specification

## Purpose
TBD - created by archiving change add-light-mode-support. Update Purpose after archive.
## Requirements
### Requirement: Theme provider manages application theme
The system SHALL provide a React context provider (`ThemeProvider`) that wraps the application and exposes the current theme (`light` | `dark`) and a `toggleTheme` function via a `useTheme()` hook. The provider SHALL add or remove the `dark` class on `document.documentElement` whenever the theme changes.

#### Scenario: Provider renders children with dark theme by default
- **WHEN** `ThemeProvider` mounts with no stored preference and system preference is dark
- **THEN** `useTheme()` returns `{ theme: "dark", toggleTheme: <function> }`
- **AND** `<html>` has class `dark`

#### Scenario: Provider renders children with light theme from system preference
- **WHEN** `ThemeProvider` mounts with no stored preference and `prefers-color-scheme` is light
- **THEN** `useTheme()` returns `{ theme: "light", toggleTheme: <function> }`
- **AND** `<html>` does NOT have class `dark`

#### Scenario: Toggle switches theme from dark to light
- **WHEN** `toggleTheme()` is called while current theme is dark
- **THEN** `useTheme()` returns `{ theme: "light" }`
- **AND** `localStorage` stores `"light"` under key `eco-metrics-theme`
- **AND** `<html>` does NOT have class `dark`

#### Scenario: Toggle switches theme from light to dark
- **WHEN** `toggleTheme()` is called while current theme is light
- **THEN** `useTheme()` returns `{ theme: "dark" }`
- **AND** `localStorage` stores `"dark"` under key `eco-metrics-theme`
- **AND** `<html>` has class `dark`

### Requirement: Theme respects stored preference over system preference
When a theme preference exists in `localStorage`, the system SHALL use that stored value regardless of `prefers-color-scheme`.

#### Scenario: Stored dark theme overrides light system preference
- **WHEN** `localStorage` has `"dark"` stored and system `prefers-color-scheme` is light
- **THEN** `useTheme()` returns `{ theme: "dark" }`

#### Scenario: Stored light theme overrides dark system preference
- **WHEN** `localStorage` has `"light"` stored and system `prefers-color-scheme` is dark
- **THEN** `useTheme()` returns `{ theme: "light" }`

### Requirement: Theme initialization is resilient to localStorage failures
The system SHALL handle cases where `localStorage` is unavailable (e.g., private browsing restrictions) by falling back to `prefers-color-scheme` without throwing errors or logging warnings.

#### Scenario: localStorage throws on read
- **WHEN** `localStorage.getItem` throws an error
- **THEN** the system falls back to `prefers-color-scheme` as the initial theme
- **AND** no error or warning is emitted to the console

#### Scenario: localStorage throws on write
- **WHEN** `localStorage.setItem` throws an error during `toggleTheme()`
- **THEN** the theme toggles in-memory anyway
- **AND** no error or warning is emitted to the console

### Requirement: Theme hook throws outside provider
The `useTheme()` hook SHALL throw a descriptive error when called outside a `ThemeProvider`, to catch misuse early during development.

#### Scenario: useTheme called without provider
- **WHEN** `useTheme()` is called in a component not wrapped by `ThemeProvider`
- **THEN** an error is thrown with message "useTheme must be used within a ThemeProvider"

### Requirement: No flash of incorrect theme on initial load
The system SHALL apply the resolved theme before first paint via a blocking inline script in the document `<head>` that reads the stored preference (falling back to `prefers-color-scheme`) and removes the `dark` class from `<html>` when light mode is resolved. This SHALL prevent any flash of the wrong theme, even before React hydrates.

#### Scenario: Light preference applies before paint
- **WHEN** the stored preference is `"light"` (or no preference exists and `prefers-color-scheme` is light)
- **THEN** the blocking script removes the `dark` class from `<html>` before first paint
- **AND** the user sees light mode from the first frame with no flash

#### Scenario: Blocking script is resilient to localStorage failures
- **WHEN** `localStorage` access throws inside the blocking script
- **THEN** the script fails silently and the default `dark` class remains


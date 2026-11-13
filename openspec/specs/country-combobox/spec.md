# country-combobox Specification

## Purpose

Provide an accessible, searchable country selector with flags, following the WAI-ARIA editable combobox pattern.

## Requirements

### Requirement: Generic searchable country combobox following the WAI-ARIA pattern

`apps/web/src/components/CountryCombobox.tsx` (a Client Component, hand-built, no UI library) SHALL accept `options: { code: string; name: string; iso2: string | null }[]`, the selected `value` (a code), `onChange(code)`, a visible `label`, an optional `placeholder` (default "Search countries"), an optional `disabled` flag, an optional `describedBy` id (set as `aria-describedby` on the input) and an optional `inputRef`, and SHALL implement the WAI-ARIA 1.2 editable combobox with list autocomplete: a `<label>` associated with an `<input role="combobox">` carrying `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` and `aria-activedescendant`; a popup `<ul role="listbox">` of `<li role="option">` elements with unique ids, the active option marked `aria-selected="true"`; `autocomplete="off"`; and a polite visually hidden live region that announces the number of matches ("12 countries found", "No countries found"). The input SHALL show the selected entity's name when closed.

#### Scenario: Roles and relationships

- **WHEN** the combobox renders
- **THEN** the input has role `combobox`, an accessible name from the label, `aria-expanded="false"` and `aria-controls` pointing to the listbox id

#### Scenario: Opening exposes the listbox

- **WHEN** the user focuses the input and presses ArrowDown
- **THEN** `aria-expanded` is `true`, a `listbox` with `option` children is rendered and `aria-activedescendant` references an option id

#### Scenario: Live region

- **WHEN** the query narrows the list to 3 matches
- **THEN** the live region reads "3 countries found"

#### Scenario: Closed state shows the selection

- **GIVEN** `value` is `OWID_WRL`
- **WHEN** the combobox is closed
- **THEN** the input value is "World"

### Requirement: Autocomplete filtering

Typing SHALL filter the options with a case-insensitive, diacritic-insensitive match (`normalize('NFD')`, combining marks removed): names starting with the query first, then names containing it, then entities whose alpha-3 code starts with the query; ties keep the original order (World first, then alphabetical). An empty query SHALL list every option. When nothing matches, the listbox SHALL show a non-selectable "No countries found" message and `aria-activedescendant` SHALL be absent.

#### Scenario: Prefix match

- **WHEN** the user types "arg"
- **THEN** Argentina is listed first

#### Scenario: Substring match

- **WHEN** the user types "land"
- **THEN** names containing "land" (e.g. Finland, Iceland) are listed after any name starting with "land"

#### Scenario: Diacritics and case

- **WHEN** the user types "COTE" and the options contain "Côte d'Ivoire"
- **THEN** it is listed

#### Scenario: Code match

- **WHEN** the user types "usa"
- **THEN** United States is listed

#### Scenario: Empty query

- **WHEN** the query is empty and the list is open
- **THEN** every option is present with World first

#### Scenario: No results

- **WHEN** the user types "zzzz"
- **THEN** "No countries found" is shown, there are no `option` elements and `aria-activedescendant` is not set

### Requirement: Keyboard interaction

ArrowDown SHALL open the list (when closed) and move the active option down, wrapping at the end; ArrowUp SHALL move up, wrapping at the start; Home and End SHALL move the active option to the first and last option while the list is open (and keep the text-caret behavior when closed); Enter SHALL select the active option, call `onChange`, close the list and show the selected name; Escape SHALL close the list when open and, when already closed, restore the selected name and discard the query; Tab SHALL close the list keeping the current selection; blur SHALL close the list and restore the selected name. The active option SHALL be scrolled into view. Pointer: clicking an option SHALL select it; the input and options SHALL not lose focus on option mousedown. A clear button (`aria-label="Clear search"`, 44 px target, focus ring) SHALL appear when the input is non-empty, empty the query and keep focus in the input.

#### Scenario: ArrowDown opens and activates

- **WHEN** the closed combobox is focused and ArrowDown is pressed
- **THEN** the list opens and the first option is active

#### Scenario: Navigation wraps

- **WHEN** the last option is active and ArrowDown is pressed
- **THEN** the first option becomes active, and ArrowUp from the first goes to the last

#### Scenario: Home and End

- **WHEN** the list is open and End then Home are pressed
- **THEN** the last then the first option is active

#### Scenario: Enter selects

- **GIVEN** "arg" typed and Argentina active
- **WHEN** Enter is pressed
- **THEN** `onChange('ARG')` is called, the list closes and the input shows "Argentina"

#### Scenario: Escape closes then restores

- **WHEN** Escape is pressed with the list open
- **THEN** the list closes
- **AND** pressing Escape again with a modified query restores the selected name

#### Scenario: Blur restores

- **GIVEN** the user typed "arg" without selecting
- **WHEN** focus leaves the input
- **THEN** the list closes and the input shows the previously selected name

#### Scenario: Click selects

- **WHEN** the user clicks the "Brazil" option
- **THEN** `onChange('BRA')` is called

#### Scenario: Clear button

- **GIVEN** the input contains "arg"
- **WHEN** the clear button is activated
- **THEN** the query is empty, the list shows every option and the input is focused

### Requirement: Flags and the globe

Each option and the input SHALL show the entity's flag through `CountryFlag`: a `<span class="fi fi-xx">` (lower-case `iso2`) with decorative `aria-hidden`, a fixed size and a subtle `ring-1 ring-line-strong` outline; entities with `iso2: null` SHALL show `GlobeIcon` (monochrome `currentColor` inline SVG, `aria-hidden`) instead. No emoji flag SHALL be rendered. `CountryFlag` SHALL import the `flag-icons` stylesheet (`flag-icons/css/flag-icons.min.css`), pinned at exactly `7.6.0` in `apps/web/package.json`. In the listbox, a flag SHALL be rendered only when its row intersects the listbox viewport (with a placeholder of the same size before that; immediately when `IntersectionObserver` is unavailable), so opening the list does not request every flag; the selected entity's flag in the input is always rendered.

#### Scenario: Flag class

- **WHEN** the Argentina option renders
- **THEN** it contains an `aria-hidden` element with classes `fi` and `fi-ar`

#### Scenario: Kosovo flag

- **WHEN** the Kosovo option (`iso2: 'XK'`) renders
- **THEN** its flag element has class `fi-xk`

#### Scenario: World shows a globe

- **WHEN** the World option renders
- **THEN** an inline SVG globe is shown and no `fi-*` element is present

#### Scenario: No emoji

- **WHEN** the rendered text of the combobox is inspected
- **THEN** it contains no regional-indicator symbols

#### Scenario: Flags are lazy in the list

- **GIVEN** an `IntersectionObserver` mock reporting only the first 5 rows as visible
- **WHEN** the list opens with 217 options
- **THEN** only those rows contain a `fi-*` element

#### Scenario: Pinned package and covered codes

- **WHEN** `apps/web/package.json` is read and the installed stylesheet is searched
- **THEN** `flag-icons` is `7.6.0` and a `.fi-xx` rule exists for every alpha-2 code of the shared crosswalk

#### Scenario: Only used flags are fetched

- **WHEN** the production build is inspected and the page is loaded in a browser with the list closed
- **THEN** the stylesheet is loaded but no flag SVG is requested for the default World selection

### Requirement: Mobile and desktop presentation with tokens only

The combobox SHALL use `text-base` (16 px) on the input to avoid iOS zoom, `min-h-11` on the input, the clear button and every option (44 px touch targets), a listbox limited to `max-h-60` with `overflow-y-auto`, the full width of its container up to `max-w-sm`, and truncated option text. Colors SHALL come only from tokens (`bg-surface-raised`, `border-line-strong`, `text-fg`, `text-fg-muted`, `bg-hover`, `text-accent`), with the repository focus-ring pattern (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset`). The active option SHALL be indicated by background and a leading bar (not by color alone) and the chosen entity by a check glyph. Wording SHALL be plain: label "Country", placeholder "Search countries", empty state "No countries found".

#### Scenario: Disabled

- **WHEN** `disabled` is set
- **THEN** the input stays focusable but is read-only with `aria-disabled="true"` and disabled styling from tokens, the list never opens, typing changes nothing and the clear button is hidden

#### Scenario: Touch targets and font size

- **WHEN** the combobox renders
- **THEN** the input, options and clear button carry the `min-h-11` class and the input carries `text-base`

#### Scenario: Token guard

- **WHEN** `designTokens.test.ts` runs
- **THEN** the combobox files contain no palette or arbitrary color utilities

#### Scenario: Visible focus

- **WHEN** the input receives keyboard focus
- **THEN** it shows the focus-ring pattern

#### Scenario: Axe

- **WHEN** the axe audit runs with the list open
- **THEN** there are no critical or serious violations

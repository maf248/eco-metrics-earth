## MODIFIED Requirements

### Requirement: Footer content and styling

The footer SHALL follow the terminal style of the site brand and contain: the site logo (decorative) with the brand text `~ eco-metrics.earth`; the tagline "Environmental data, made readable."; a link to `/data-sources/` whose visible text is `data-sources/` after a decorative, `aria-hidden` `$ cd` prompt, with accessible name "Data sources"; and the bottom line "© 2026 eco-metrics earth · by maf248 · Privacy", in which "Privacy" is a plain text link to `/privacy/` and the only addition to that line. The Privacy link SHALL inherit the `text-xs` size of the bottom line and use `LINK_CLASS_NAME`. The footer SHALL contain exactly these two links and no other content; "Privacy" SHALL NOT be added to the main navigation or to the `$ cd` slot. It SHALL use only design-system color tokens (e.g. `border-line`, `text-fg-secondary`, `text-accent`, `hover:text-accent-hover`), render correctly in light and dark themes, show an underline on each link (not color alone), and use the project focus-visible ring pattern (`focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset`). The text/link contrast SHALL pass axe color-contrast in both themes.

#### Scenario: Link to the data sources page

- **WHEN** the footer is rendered
- **THEN** it contains a link named "Data sources" whose `href` ends with `/data-sources/`

#### Scenario: Link to the privacy page

- **WHEN** the footer is rendered
- **THEN** it contains a link named "Privacy" whose `href` ends with `/privacy/`
- **AND** the link is inside the bottom copyright line, after "by maf248"

#### Scenario: Brand, tagline and signature

- **WHEN** the footer is rendered
- **THEN** it shows `~ eco-metrics.earth`, "Environmental data, made readable." and "© 2026 eco-metrics earth · by maf248 · Privacy"
- **AND** the `$ cd` prompt is `aria-hidden`

#### Scenario: Only one interactive element

- **WHEN** the footer is rendered
- **THEN** it contains one link in the `$ cd` slot ("Data sources") and one in the bottom line ("Privacy"), two links in total, and no other interactive elements

#### Scenario: Privacy is not in the navigation

- **WHEN** the main navigation and `NAV_ITEMS` are rendered
- **THEN** they contain no "Privacy" entry

#### Scenario: Keyboard focus is visible

- **WHEN** either link receives keyboard focus
- **THEN** it shows the focus ring classes of the project pattern

#### Scenario: Only tokens

- **WHEN** `designTokens.test.ts` runs
- **THEN** it passes with `Footer.tsx` included (no palette or arbitrary colors)

#### Scenario: Privacy link keeps the discreet style

- **WHEN** the footer is rendered
- **THEN** the Privacy link has the classes of `LINK_CLASS_NAME` and no size class of its own, so it renders at the `text-xs` size of the line that holds it

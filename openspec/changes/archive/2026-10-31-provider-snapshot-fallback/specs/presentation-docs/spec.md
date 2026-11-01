## ADDED Requirements

### Requirement: The stale notice and unavailable state patterns are recorded

`docs/design-system.md` SHALL document, in the same change that introduces them: the three warning tokens in the Color Tokens table (with contrast ratios); the stale notice pattern (banner above the section content, copy, `role="status"`, shown only between the silent and unavailable thresholds, date through the UTC formatter); the unavailable state pattern (replaces only the section content, header and source attribution stay, neutral tone with the warning icon rather than error red, `role="status"` not `alert`, no retry button because ISR retries server-side, optional last-retrieved line only when a date is known); and the default thresholds (7 and 30 days) with the note that a category may override them in the page registry.

#### Scenario: Tokens and patterns are present

- **WHEN** `docs/design-system.md` is read
- **THEN** it lists `warning-surface`, `warning-line` and `warning-fg`, and has sections for the stale notice and the unavailable state with the rules above

#### Scenario: Thresholds are recorded

- **WHEN** the document is searched for the thresholds
- **THEN** it states the 7-day and 30-day defaults and the per-category override

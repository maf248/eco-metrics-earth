# Proposal

## Why

The energy sources year table has nine columns and the `wide` flag gave it a fixed 832 px minimum
width, wider than the 812 px desktop card. It always scrolled sideways, even on desktop, and the
table layout handed the spare width to the longest header, "Bioenergy & other renewables (%)",
which took one 224 px line and left a wide empty column under it.

## What Changes

- With `wide`, the text of each value header wraps at `max-w-32` (balanced), so the long header
  takes two lines ("Bioenergy & other" / "renewables (%)") like the short ones ("Coal" / "(%)").
- The `wide` minimum width drops from `min-w-208` (832 px) to `min-w-3xl` (768 px): the table fits
  the desktop card without scrolling, and on narrower viewports it scrolls before its headers
  grow past two lines.
- Tables without `wide` (CO2, global temperature) are unchanged.

## Non-Goals

- No shorter source label: "Bioenergy & other renewables" stays as it is everywhere else.
- No change to the columns, the values or the collapsed behavior.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `country-explorer`: the `wide` flag of the generic year table also caps the header text width,
  and its minimum width fits the desktop card.

## Impact

- `apps/web/src/components/YearDataTable.tsx` and its unit test, the energy sources E2E spec and
  `docs/design-system.md` (Tables follow the toggle).

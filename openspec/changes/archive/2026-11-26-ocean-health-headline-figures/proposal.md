## Why

The top of the ocean health page only speaks about the daily sea surface temperature: a two-sentence intro and two long sentences on the latest day and the daily record. The most striking facts of the page (how much the ocean has warmed, how much the sea has risen, how much more acidic it is) are buried in the sections below, and the sea level section shows a trend in mm/year but never says how much the sea rose over the record.

## What Changes

- The intro becomes one short sentence that lists what the page covers.
- The key figures become a panel of up to four headline figures, each derived from its own section's payload:
  - latest daily sea surface temperature, its anomaly against 1991–2020 and its date, with the daily record on a second line (the gap to the record is dropped);
  - ocean warming: the world's latest annual sea surface temperature anomaly against 1861–1890, with the warmest year;
  - sea level rise: the change from the first to the latest observation, in centimetres, with the period and the published trend;
  - ocean acidity: the change in hydrogen ion concentration implied by the first and latest yearly pH averages at Hawaii.
- Each figure names its period and its source, and is left out when its section has no payload to show; with none, the panel is not rendered. The Copernicus stale notice and unavailable state move from above the key figures to the daily chart's slot.
- The sea level section states the rise from the first to the latest observation under the published trend.

## Impact

- Web only: `OceanHealthContent`, a new `OceanKeyFigures` replacing `OceanSstKeyFigures`, `oceanHealthKeyFigures`, the sea level and daily sections, the skeleton, unit and E2E tests, `docs/design-system.md`.
- No API or shared type change: every figure is derived from payloads the page already reads.
- Spec: `ocean-health-page`.

# Energy sources fixtures

Captured once, by hand, on 26 Oct 2026 from the exact URLs the service uses (header
`User-Agent: eco-metrics-earth-api (+https://github.com/maf248/eco-metrics-earth)`); never refreshed inside a test.

- `electricity-production-by-source.csv`: the chart CSV
  (`https://ourworldindata.org/grapher/electricity-production-by-source.csv?v=1&csvType=filtered&useColumnShortNames=true&time=2000..2026&country=<allowlist>`)
  trimmed to World, Algeria, Argentina, Bosnia and Herzegovina, Niue and Spain (2000-2025). It differs
  intentionally from the E2E copy in `apps/web/e2e/fixtures/owid/`: this one is hand-edited for edge
  cases (World rows for 1990 and 1999 with coal `9999.99`, and two `OWID_EU27` rows); the real edge cases
  (blanks, Algeria's zeros-only 2025 row, all-zero Niue) are kept as returned.
- `indicator-1295503-metadata.json`: `https://api.ourworldindata.org/v1/indicators/1295503.metadata.json`,
  trimmed to the fields the client reads and to the entities above.

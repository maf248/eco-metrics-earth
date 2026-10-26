# Global temperature fixtures

Captured once, by hand, on 25 Oct 2026 (years 1940-1942 for the per-country chart, 1850-1852 for HadCRUT5) from the exact URLs the service uses
(request header `User-Agent: eco-metrics-earth-api (+https://github.com/maf248/eco-metrics-earth)`).
They are never refreshed inside a test.

- `annual-temperature-anomalies.csv` comes from
  `https://ourworldindata.org/grapher/annual-temperature-anomalies.csv?v=1&csvType=filtered&useColumnShortNames=true&tab=chart&country=OWID_WRL~OWID_KOS~ARG~USA~OWID_EUR~ZZZ&time=1940..1942`.
  OWID returned only `OWID_WRL`, `OWID_KOS`, `ARG` and `USA`, so the file was edited by hand:
  - the `OWID_EUR` (continent aggregate) and `ZZZ` (code outside the allowlist) rows were
    added to prove they are dropped;
  - Argentina's 1941 value was blanked (a missing year);
  - the United States 1941 value was replaced with `-0.001` (a value that rounds to zero).
    All other values are as returned (several are negative).
- `indicator-1325256-metadata.json` is the capture of
  `https://api.ourworldindata.org/v1/indicators/1325256.metadata.json`, trimmed to the fields the client
  reads (`descriptionShort`, `datasetName`, `datasetVersion`, `updatedAt` and so on) and to the
  entities used above.
- `temperature-anomaly.csv` comes from
  `https://ourworldindata.org/grapher/temperature-anomaly.csv?v=1&csvType=filtered&useColumnShortNames=true&tab=chart&country=OWID_WRL&time=1850..1852`
  (the HadCRUT5 mean and its 95% bounds, World only). The file was edited by hand:
  the `OWID_NH` and `OWID_SH` hemisphere rows were added to prove they are ignored, and the lower
  bound of 1851 was blanked (a missing bound).
- `indicator-1325020-metadata.json` is the capture of
  `https://api.ourworldindata.org/v1/indicators/1325020.metadata.json`, trimmed like the one above.

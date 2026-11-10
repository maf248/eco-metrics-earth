## Context

The CO2 page receives every country and year in one payload (`Co2EmissionsData`, year-aligned
arrays from 1750) and renders key figures plus a one-country line chart. `docs/design-system.md`
already chose ECharts for maps and listed four open questions; a throwaway spike on real data
answered them and iterated the presentation with the user over four rounds.

## Decisions

### 1. Geometry: hybrid Natural Earth, pre-projected, committed as a static asset

| Variant                                 | Gzipped    | Result                                                                                                                |
| --------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `world-atlas` 110m                      | ~44 KB     | Clean hand-generalized coasts; lacks 63 small territories (Singapore, Bahrain, Malta, Hong Kong, the Lesser Antilles) |
| 50m simplified by algorithm             | ~51 KB     | Jagged coasts; tiny islands collapse — rejected by the user                                                           |
| 50m full                                | ~303 KB    | Finest, 7× heavier                                                                                                    |
| **110m + missing territories from 50m** | **~50 KB** | **Chosen**: clean coasts and every territory                                                                          |

`scripts/generate-world-geometry.mjs` builds `apps/web/public/geo/world-countries.json` once:
features from 110m plus the 50m features whose code 110m lacks, Antarctica removed, projected with
`d3-geo` Equal Earth through `d3-geo-projection`'s `geoProject` (which cuts the antimeridian, so
Russia and Fiji do not smear), screen y negated (ECharts reads registered coordinates as lon/lat,
y up), coordinates rounded to 0.1 px of a 1000 px frame. Each feature carries
`{ key, code, name }`: `code` is the OWID entity code resolved from the ISO numeric id
(`i18n-iso-countries`), `OWID_KOS` for Kosovo (no ISO code), `null` for regions without one
(N. Cyprus, Somaliland, Indian Ocean Ter., Siachen Glacier); `key` is the code or
`region:<name>`, unique per feature. The map series matches data by `key` (`nameProperty`):
matching by `code` collapsed the code-less regions onto one name, so only one of them received
its no-data item and the others fell back to ECharts' default fill (seen as a blue Somaliland). The file also carries `aspect` (width / height of the projected
world). The asset is committed; the script and its devDependencies are only needed to regenerate it.
Known limitation: French Guiana is part of France's feature, so it shows France's value.

**Alternative rejected:** projecting in the browser (ships `d3-geo` + `topojson-client`, ~10 KB gz,
and CPU on every visit for an output that never changes).

### 2. Delivery: fetched once, registered once

`lib/worldGeometry.ts` fetches the asset on first use, registers it with `echarts.registerMap`
under one name and memoises the promise. A failed fetch is retried on the next mount.

### 3. Colors stay in the theme

A probe confirmed ECharts applies theme defaults to the visual map (`visualMap.inRange.color`) and to
the map series (`map.itemStyle.areaColor`, borders, emphasis and select styles). The theme adapter
adds both from tokens: `--chart-seq-1…5` for the classes and `--chart-no-data` for regions without a
value (a `NaN` value gets no visual-map color and falls back to the series area color). Options
never name a color. The HTML legend reads the same tokens as `var(--…)` in inline styles.

### 4. Palette: yellow → red, five classes (deviation recorded)

The user found the single-hue blue ramp unintuitive ("I had to click several countries to see which
emits more"). A multi-hue ramp with monotone lightness keeps the ordinal reading and adds "hotter is
more". Class breaks for tonnes per person: < 1, 1–3, 3–6, 6–10, ≥ 10. Same hue order in both
themes (yellow = low), lightness decreasing with the value.

| Token           | Light     | Dark      |
| --------------- | --------- | --------- |
| `chart-seq-1`   | `#f5af20` | `#fed25f` |
| `chart-seq-2`   | `#ec8300` | `#f9a129` |
| `chart-seq-3`   | `#de5300` | `#f16a00` |
| `chart-seq-4`   | `#c1291b` | `#da3b21` |
| `chart-seq-5`   | `#8a161b` | `#b32322` |
| `chart-no-data` | `#e5e5e5` | `#262626` |

Validated with the ordinal checks (monotone lightness, adjacent ΔL ≥ 0.06): pass in both themes.
Recorded exceptions: hue spread 53°/61° (multi-hue by decision); the light low end is 1.90:1 against
white (floor 2:1), compensated by the country outlines, the legend and the table.

### 5. Layout: the box takes the map's aspect ratio

With `left/right/top/bottom` all set, ECharts **stretches** the map to the box, ignoring
`aspectScale`. The map box therefore uses the asset's aspect ratio (`aspect-[2238/1000]`, asserted
against the asset by a unit test), zoom 1 on every width, centered on the whole map. The skeleton
uses the same box.

### 6. Controls

`roam: true` with `scaleLimit` 1–12. Wider screens: one vertical group (zoom in, zoom out, reset)
with SVG icons at the bottom left, over the ocean. Narrow screens (< 640 px): pinch to zoom; only a
reset button, shown after a `georoam` event and hidden by the reset. The wrapper `EChart` gains
`onReady(chart)` so the component can read and set the view.

### 7. Year, ranking and selection

- One year state for map and table, defaulting to `data.endYear`. `YearSlider` is a native range
  input (keyboard and screen reader behavior for free) with the year in a bubble that follows the
  thumb, the first and last years at the ends and a decade scale below.
- `rankCo2Countries(data, year, { key, order })` returns countries (World and entities without a
  per-capita value for that year excluded) with competition ranking by the sort measure
  (`perCapita` or `total`; equal values share a rank), name order for ties; the rank stays the
  position in the descending order whichever way the table is sorted, and a country without a
  total goes last, unranked, when sorting by total.
- The table is collapsed under "View data table", like every other data table of the site (user
  feedback: the map is the comparison; the table is its text equivalent and a sortable list),
  inside a keyboard-focusable scroll region, with columns Rank, Country (flag + name), Per capita,
  Total. Both value headers are sort buttons: the active one reverses the order, the other sorts
  by itself, highest first; `aria-sort` sits on the active header cell. Below 640 px the region
  bleeds into the card padding like the charts and cells tighten, so four columns with flags fit
  at 360 px. Every year change keeps the chosen sort.
- Selection: `selectedMode: 'single'` on the series. A map click selects the country and highlights
  its row (scrolled into view inside the region only, never the page, also when the table is
  opened); a row's country button selects it on the map through the option (`selected` on its data
  item). Selecting the selected country again clears it, and a year change clears a selection
  without a value in the new year.

### 8. Page order and loading

Intro → map card (title, slider, map, legend, ranking) → key figures → explorer. The map is the
first chart, so the line chart below it renders when it scrolls into view (`RenderWhenVisible`,
chart rule 5). `CATEGORY_SKELETONS` for CO2 becomes intro + map block (down to the first chart). The map
skeleton is the land outline (`land-110m`, Antarctica removed, simplified to ~3 KB gzipped)
projected by the same script into the map's own frame (`public/geo/world-silhouette.svg`), so the
placeholder has the shape and position of the map that replaces it; it has no plot box, as the map
has none. It is a CSS mask over the `well-active` token, not an inlined path: `ChartSkeleton` is in
every chart page and in the client navigation, which must not ship a CO2-only outline as JS.

## Risks

- **Geometry fetch fails:** the map keeps its skeleton; the ranking table and the rest of the page
  are unaffected.
- **Asset and CSS aspect drift** if the asset is regenerated: a unit test reads the asset's `aspect`.
- **Page weight:** ~200 table rows of server HTML (~40 KB uncompressed) — acceptable and indexable.

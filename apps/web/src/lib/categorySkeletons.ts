import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { EcoCategory } from '@eco-metrics/shared';

/** The text of a block is sample copy, drawn as bars: it wraps like the real text at any width. */
export type SkeletonBlock =
  | { kind: 'intro'; text: string; note?: string }
  | { kind: 'keyFigures'; lead: string; details: readonly string[] }
  | {
      kind: 'explorer';
      heading: string;
      chartTitle: string;
      hasMeasureToggle?: boolean;
      hasDonut?: boolean;
    }
  | { kind: 'productList'; status: string }
  /** A world map card: title, year slider, map box and legend. */
  | { kind: 'worldMap'; title: string };

/**
 * The data region of each category with live data, top to bottom, down to the first chart or
 * list: what the visitor sees before scrolling must not move when the page arrives. It is
 * separate from `CATEGORY_PAGES`, which is server-only, because a pending navigation reads it on
 * the client. A category absent here is a placeholder: it has no data region and no skeleton.
 */
export const CATEGORY_SKELETONS: Partial<Record<EcoCategory, readonly SkeletonBlock[]>> = {
  [ECO_CATEGORIES.WATER_FOOTPRINT]: [
    {
      kind: 'intro',
      text: 'Compare the water footprint of everyday products — from food and textiles to technology, manufactured goods and computing.',
      note: 'Entries are measured on different bases — see the “Water type” column. Blue-water values count freshwater withdrawals only, green + blue + grey values also count rainwater and the water needed to dilute pollution, and life-cycle values differ by whether they include the water embodied in electricity. Values of different water types are not directly comparable.',
    },
    {
      kind: 'productList',
      status: 'Showing 60 of 60 products — All categories, sorted by water footprint (high to low)',
    },
  ],
  [ECO_CATEGORIES.CO2_EMISSIONS]: [
    {
      kind: 'intro',
      text: 'How much CO2 does each country emit? Explore annual emissions since 1750, in total and per person.',
    },
    { kind: 'worldMap', title: 'CO2 emissions per capita, 2024 (tonnes per person)' },
  ],
  [ECO_CATEGORIES.GLOBAL_TEMPERATURE]: [
    {
      kind: 'intro',
      text: 'How far is each year’s temperature from the recent average? Explore annual surface temperature by country since 1940.',
    },
    {
      kind: 'keyFigures',
      lead: 'In 2025 the world’s average surface temperature was +0.59 °C relative to the 1991–2020 average.',
      details: [
        'The warmest year since 1940 was 2024, at +0.72 °C.',
        'In 2025 the world was +1.41 °C warmer than the 1861–1890 (pre-industrial) average.',
      ],
    },
    {
      kind: 'explorer',
      heading: 'Explore temperature by country',
      chartTitle: 'World: annual temperature anomaly (°C, relative to the 1991–2020 average)',
    },
  ],
  [ECO_CATEGORIES.ENERGY_SOURCES]: [
    {
      kind: 'intro',
      text: 'Where does a country’s electricity come from? Explore how much is generated from coal, gas, oil, nuclear, hydro, wind, solar and bioenergy since 2000.',
    },
    {
      kind: 'keyFigures',
      lead: 'In 2025, renewables generated 33.8% of the world’s electricity.',
      details: ['The largest single source was coal, at 33.0%.'],
    },
    {
      kind: 'explorer',
      heading: 'Explore the electricity mix by country',
      chartTitle: 'World: share of electricity by source (%)',
      hasMeasureToggle: true,
      hasDonut: true,
    },
  ],
};

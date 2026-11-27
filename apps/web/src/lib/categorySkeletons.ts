import { WASTE_INTRO } from '@/lib/wasteCopy';
import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { EcoCategory } from '@eco-metrics/shared';

/** The text of a block is sample copy, drawn as bars: it wraps like the real text at any width. */
export type SkeletonBlock =
  | { kind: 'intro'; text: string; note?: string }
  | { kind: 'keyFigures'; lead: string; details: readonly string[] }
  /** A grid of headline figures: a label, a large value, short lines and a source each. */
  | {
      kind: 'figureGrid';
      figures: readonly {
        label: string;
        value: string;
        lines: readonly string[];
        source: string;
      }[];
    }
  | {
      kind: 'explorer';
      heading: string;
      chartTitle: string;
      /** Text under the chart title, when the page has one. */
      subtitle?: string;
      hasMeasureToggle?: boolean;
      hasDonut?: boolean;
      /** Whether the card follows another card of the page, which sets it apart by a margin. */
      follows?: boolean;
    }
  | {
      kind: 'map';
      title: string;
      /** Card heading above the map title, when the card has one. */
      heading?: string;
      hasMeasureToggle?: boolean;
      /** Legend class labels, drawn as swatches under the map, when the map has a legend. */
      legendLabels?: readonly string[];
      /** Whether a collapsed "View data table" disclosure closes the card. */
      hasTableDisclosure?: boolean;
    }
  | { kind: 'chart'; heading: string; intro: string; chartTitle: string }
  | { kind: 'productList'; status: string };

/**
 * The data region of each category with live data, top to bottom, down to the first chart or
 * list: what the visitor sees before scrolling must not move when the page arrives. It is
 * separate from `CATEGORY_PAGES`, which is server-only, because a pending navigation reads it on
 * the client. A category absent here is a placeholder: it has no data region and no skeleton.
 */
export const CATEGORY_SKELETONS: Partial<Record<EcoCategory, readonly SkeletonBlock[]>> = {
  [ECO_CATEGORIES.WASTE_RECYCLING]: [
    { kind: 'intro', text: WASTE_INTRO },
    {
      kind: 'keyFigures',
      lead: 'In the latest year the world generated billions of tonnes of municipal waste, measured in kilograms per person per day.',
      details: [
        'By the middle of the century it is projected to grow by around a half.',
        'Among the countries that report recycling, home to about half of the world’s population, a share of municipal waste is recycled.',
      ],
    },
    { kind: 'map', title: 'Share of municipal waste recycled', hasMeasureToggle: true },
  ],
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
    {
      kind: 'keyFigures',
      lead: 'In 2024 the world emitted 38,599 million tonnes of CO2, 4.73 tonnes per person.',
      details: [],
    },
    {
      kind: 'explorer',
      heading: 'Explore emissions by country',
      chartTitle: 'World: total CO2 emissions (million tonnes per year)',
      hasMeasureToggle: true,
    },
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
  [ECO_CATEGORIES.OCEAN_HEALTH]: [
    {
      kind: 'intro',
      text: 'Daily sea surface temperature, plus the ocean’s annual warming, stored heat, sea level and pH.',
    },
    {
      kind: 'figureGrid',
      figures: [
        {
          label: 'Latest daily sea surface temperature',
          value: '20.88 °C',
          lines: [
            '+0.76 °C vs the 1991–2020 average, ocean between 60°S–60°N, on 22 Nov 2026',
            'Daily record since 1979: 21.11 °C on 24 Aug 2026',
          ],
          source: 'Source: Copernicus Climate Pulse',
        },
        {
          label: 'Ocean warming',
          value: '+1.10 °C',
          lines: [
            'World sea surface temperature in 2025, vs the 1861–1890 average',
            'Warmest year: 2024 (+1.21 °C)',
          ],
          source: 'Source: Met Office Hadley Centre, via Our World in Data',
        },
        {
          label: 'Sea level rise',
          value: '+10 cm',
          lines: ['Global mean sea level, Dec 1992 to Feb 2025', 'Trend: 3.11 mm/year'],
          source: 'Source: NOAA Laboratory for Satellite Altimetry',
        },
        {
          label: 'Ocean acidity',
          value: '+17%',
          lines: [
            'More acidic at Hawaii, 1989–2024',
            'pH fell from 8.11 to 8.04 (yearly averages)',
          ],
          source: 'Source: Hawaii Ocean Time-series, via Our World in Data',
        },
      ],
    },
    {
      kind: 'chart',
      heading: 'Daily sea surface temperature since 1979',
      intro:
        'Every line is one year of the daily average sea surface temperature, laid over the same calendar days, so the current year can be read against all the earlier ones.',
      chartTitle: 'Daily sea surface temperature, 60°S–60°N (°C)',
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
  [ECO_CATEGORIES.DEFORESTATION]: [
    { kind: 'intro', text: 'How much forest is the world losing, where, and why?' },
    {
      kind: 'keyFigures',
      lead: 'Since 1990 the world has lost a net share of its forest, an area about the size of a large country. Forests now cover about a third of the world’s land.',
      details: [],
    },
    {
      kind: 'explorer',
      heading: 'Forest area',
      chartTitle: 'World: forest area (million hectares)',
      subtitle:
        'Forest area, plantations included. FAO reports at intervals of 5 to 10 years; the years in between are interpolated. The vertical axis does not start at zero.',
      hasMeasureToggle: true,
    },
    {
      kind: 'map',
      heading: 'Forest change since 1990',
      title: 'Change in forest area since 1990 (%)',
      legendLabels: [
        '< −50%',
        '−50 to −25%',
        '−25 to −5%',
        '−5 to +5%',
        '+5 to +25%',
        '+25 to +50%',
        '≥ +50%',
        'No data',
      ],
      hasTableDisclosure: true,
    },
    {
      kind: 'explorer',
      heading: 'Tree cover loss by cause',
      chartTitle: 'World: tree cover loss by cause (million hectares per year)',
      subtitle:
        'Tree cover loss detected by satellite each year, by dominant cause, in million hectares. It is not the same as deforestation: loss from fires and logging is often followed by regrowth.',
      follows: true,
    },
  ],
};

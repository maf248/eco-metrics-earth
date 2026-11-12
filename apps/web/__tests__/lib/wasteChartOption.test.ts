import {
  buildCompositionBarsOption,
  compositionBarsHeights,
  treatmentBarsHeights,
  buildProjectionOption,
  buildTreatmentBarsOption,
  formatProjected,
  hasComposition,
  hasTreatment,
  projectionTonnes,
  projectionUnit,
} from '@/lib/wasteChartOption';

import { WASTE_COUNTRIES, WASTE_FIXTURE, wasteCountry } from '../fixtures/wasteRecycling';

interface BarOption {
  aria: { label: { description: string } };
  tooltip: { formatter: (params: { dataIndex: number }[]) => string };
  yAxis: { data: string[] };
  series: { name: string; data: (number | null)[]; stack: string }[];
}

const treated = WASTE_COUNTRIES.filter(hasTreatment);

describe('buildTreatmentBarsOption', () => {
  const option = buildTreatmentBarsOption(treated) as unknown as BarOption;

  it('should draw one bar per country and one stacked series per group', () => {
    expect(option.yAxis.data).toEqual(treated.map(({ name }) => name));
    expect(option.series).toHaveLength(8);
    expect(new Set(option.series.map(({ stack }) => stack)).size).toBe(1);
  });

  it('should stack every country bar to 100 %', () => {
    for (const [index] of option.yAxis.data.entries()) {
      const total = option.series.reduce((sum, { data }) => sum + (data[index] ?? 0), 0);
      expect(total).toBeCloseTo(100, 5);
    }
  });

  it('should keep the wide label width in the default media entry and narrow it on phones', () => {
    const { media } = option as unknown as {
      media: {
        query?: { maxWidth: number };
        option: { yAxis?: { axisLabel: { width: number } } };
      }[];
    };

    expect(media[0].query).toBeUndefined();
    expect(media[0].option.yAxis?.axisLabel.width).toBe(128);
    expect(media[media.length - 1]).toMatchObject({
      query: { maxWidth: 480 },
      option: { yAxis: { axisLabel: { width: 84 } } },
    });
  });

  it('should reserve the plot geometry its height is computed from', () => {
    const { grid } = option as unknown as { grid: { top: number; bottom: number } };

    expect(grid.top).toBe(8);
    // Axis labels (24) and the legend gap are on top of the legend rows in the box height.
    expect(treatmentBarsHeights(10).wide).toBeGreaterThan(8 + 10 * 32 + 24 + grid.bottom - 1);
  });

  it('should grow the box with the number of bars and give a phone at least the legend rows', () => {
    expect(treatmentBarsHeights(3).wide - treatmentBarsHeights(2).wide).toBe(32);
    expect(treatmentBarsHeights(5).narrow).toBeGreaterThanOrEqual(treatmentBarsHeights(5).wide);
    expect(compositionBarsHeights(5).narrow).toBeLessThanOrEqual(treatmentBarsHeights(5).narrow);
  });

  it('should give the country labels room for one line of a long name and break longer ones', () => {
    const { yAxis } = option as unknown as {
      yAxis: { axisLabel: { width: number; overflow: string } };
    };

    expect(yAxis.axisLabel).toMatchObject({ width: 128, overflow: 'break' });
  });

  it('should keep an unreported group as null, never 0', () => {
    const recycling = option.series[0].data;
    expect(recycling[option.yAxis.data.indexOf('India')]).toBeNull();
    expect(recycling[option.yAxis.data.indexOf('Germany')]).toBe(47);
  });

  it('should name an unreported group in the tooltip', () => {
    const text = option.tooltip.formatter([{ dataIndex: option.yAxis.data.indexOf('India') }]);
    expect(text).toContain('India · 2020');
    expect(text).toContain('Recycling: <strong>not reported</strong>');
  });

  it('should escape a country name in the tooltip', () => {
    const risky = { ...wasteCountry('DEU'), name: '<img src=x onerror=1>' };
    const escaped = buildTreatmentBarsOption([
      risky as (typeof treated)[number],
    ]) as unknown as BarOption;

    const text = escaped.tooltip.formatter([{ dataIndex: 0 }]);
    expect(text).toContain('&lt;img src=x onerror=1&gt;');
    expect(text).not.toContain('<img');
  });

  it('should return an empty tooltip for an unknown row', () => {
    expect(option.tooltip.formatter([{ dataIndex: 99 }])).toBe('');
    expect(option.tooltip.formatter([])).toBe('');
  });
});

describe('buildCompositionBarsOption', () => {
  it('should draw six groups for the countries with composition', () => {
    const option = buildCompositionBarsOption(
      WASTE_COUNTRIES.filter(hasComposition),
    ) as unknown as BarOption;

    expect(option.series.map(({ name }) => name)).toEqual([
      'Food and organic',
      'Paper and cardboard',
      'Plastic',
      'Glass',
      'Metal',
      'Other',
    ]);
    expect(option.yAxis.data).toContain('Nigeria');
  });
});

describe('type guards', () => {
  it('should tell countries with and without the data apart', () => {
    expect(hasTreatment(wasteCountry('NGA'))).toBe(false);
    expect(hasComposition(wasteCountry('TUV'))).toBe(false);
    expect(hasComposition(wasteCountry('DEU'))).toBe(true);
  });
});

describe('projection', () => {
  it('should pick the unit from the largest value', () => {
    expect(projectionUnit(3.49e9).label).toBe('billion tonnes');
    expect(projectionUnit(5e8).label).toBe('million tonnes');
    expect(projectionUnit(3e3).label).toBe('thousand tonnes');
  });

  it('should list the four years of tonnes and format them in the unit', () => {
    const tonnes = projectionTonnes(WASTE_FIXTURE.world.generation);
    expect(tonnes).toHaveLength(4);
    expect(formatProjected(tonnes[0], projectionUnit(tonnes[3]))).toBe('2.33');
    expect(formatProjected(tonnes[3], projectionUnit(tonnes[3]))).toBe('3.49');
  });

  it('should let the axis follow the data instead of starting at zero', () => {
    const { yAxis } = buildProjectionOption(
      'World',
      WASTE_FIXTURE.world.generation,
      projectionUnit(WASTE_FIXTURE.world.generation.tonnes2050),
    ) as unknown as {
      yAxis: {
        scale: boolean;
        min?: number;
        boundaryGap: string[];
        axisLabel: { formatter: (v: number) => string };
      };
    };

    expect(yAxis.scale).toBe(true);
    expect(yAxis.min).toBeUndefined();
    expect(yAxis.boundaryGap).toEqual(['15%', '15%']);
    expect(yAxis.axisLabel.formatter(2.3456)).toBe('2.35');
    expect(yAxis.axisLabel.formatter(3)).toBe('3.0');
  });

  it('should chart the world from 2.33 to 3.49 billion tonnes', () => {
    const option = buildProjectionOption(
      'World',
      WASTE_FIXTURE.world.generation,
      projectionUnit(WASTE_FIXTURE.world.generation.tonnes2050),
    ) as unknown as {
      aria: { label: { description: string } };
      tooltip: { formatter: (p: { axisValueLabel: string; value: number }[]) => string };
      xAxis: { data: string[] };
      series: { data: number[] }[];
    };

    expect(option.xAxis.data).toEqual(['2022', '2030', '2040', '2050']);
    expect(option.series[0].data[0]).toBeCloseTo(2.33, 2);
    expect(option.series[0].data[3]).toBeCloseTo(3.49, 2);
    expect(option.aria.label.description).toContain('World Bank projections');
    expect(option.tooltip.formatter([{ axisValueLabel: '2030', value: 2.65 }])).toContain(
      '(projection)',
    );
    expect(option.tooltip.formatter([{ axisValueLabel: '2022', value: 2.33 }])).not.toContain(
      'projection',
    );
  });
});

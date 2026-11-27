import { formatHeatContent } from '@/lib/formatNumber';
import {
  buildOceanHeatOption,
  describeSources,
  orderedSources,
  sourceSpan,
} from '@/lib/oceanHeatChartOption';

import { findColorStrings } from '../fixtures/colorStrings';
import { OCEAN_HEAT_FIXTURE } from '../fixtures/oceanHealth';

interface Series {
  name: string;
  data: (number | null)[];
  connectNulls: boolean;
}

interface Option {
  aria: { label: { description: string } };
  legend: { show: boolean };
  tooltip: {
    formatter: (
      params: { axisValueLabel: string; marker: string; seriesName: string; value: unknown }[],
    ) => string;
  };
  xAxis: { data: string[] };
  yAxis: { scale: boolean };
  series: Series[];
}

const [upper, deep] = OCEAN_HEAT_FIXTURE.depths;
const build = (depth = upper) =>
  buildOceanHeatOption(depth, OCEAN_HEAT_FIXTURE) as unknown as Option;

describe('buildOceanHeatOption', () => {
  it('should draw four sources at 700 m and three at 2000 m, named after the sources', () => {
    expect(build(upper).series.map(({ name }) => name)).toEqual([
      'IAP',
      'NOAA',
      'MRI/JMA',
      'CSIRO',
    ]);
    expect(build(deep).series.map(({ name }) => name)).toEqual(['IAP', 'NOAA', 'MRI/JMA']);
  });

  it('should keep a source at the same position, so at the same palette color, at both depths', () => {
    const at700 = build(upper).series.map(({ name }) => name);
    const at2000 = build(deep).series.map(({ name }) => name);

    for (const [index, name] of at2000.entries()) {
      expect(at700.indexOf(name)).toBe(index);
    }
  });

  it('should leave the gaps of a source that ends early as null, never zero', () => {
    const noaa = build(upper).series.find(({ name }) => name === 'NOAA');
    const mri = build(upper).series.find(({ name }) => name === 'MRI/JMA');

    expect(noaa?.data).toEqual([8, 9, 10, 11, null]);
    expect(mri?.data.slice(3)).toEqual([null, null]);
    expect(mri?.connectNulls).toBe(false);
  });

  it('should share one year axis and always show the legend', () => {
    const option = build();

    expect(option.xAxis.data).toEqual(['2020', '2021', '2022', '2023', '2024']);
    expect(option.legend.show).toBe(true);
  });

  it('should keep zero inside the value axis', () => {
    expect(build().yAxis.scale).toBe(false);
  });

  it('should list only the sources with a value in the tooltip, signed with the real minus', () => {
    const params = [
      { axisValueLabel: '2022', marker: '', seriesName: 'IAP', value: -1.5 },
      { axisValueLabel: '2022', marker: '', seriesName: 'CSIRO', value: null },
    ];

    expect(build().tooltip.formatter(params)).toBe('2022<br/>IAP: −1.5 10²² J');
  });

  it('should print No data when no source has a value that year', () => {
    const params = [{ axisValueLabel: '2024', marker: '', seriesName: 'CSIRO', value: null }];

    expect(build().tooltip.formatter(params)).toBe('2024<br/>No data');
  });

  it('should set its own aria description naming the depth and the sources', () => {
    const { description } = build(deep).aria.label;

    expect(description).toContain('0 to 2000 m');
    expect(description).toContain('IAP, NOAA, MRI/JMA');
    expect(description).not.toContain('NaN');
  });

  it('should name no color', () => {
    expect(findColorStrings(build())).toEqual([]);
  });
});

describe('orderedSources', () => {
  it('should put unknown sources after the known ones, in the order given', () => {
    const sources = [
      { id: 'zzz', name: 'Z', values: [] },
      { id: 'noaa', name: 'NOAA', values: [] },
      { id: 'aaa', name: 'A', values: [] },
      { id: 'iap', name: 'IAP', values: [] },
    ];

    expect(orderedSources(sources).map(({ id }) => id)).toEqual(['iap', 'noaa', 'zzz', 'aaa']);
  });

  it('should not reorder the payload it was given', () => {
    const sources = [...upper.sources].reverse();
    const ids = sources.map(({ id }) => id);

    orderedSources(sources);

    expect(sources.map(({ id }) => id)).toEqual(ids);
  });
});

describe('describeSources', () => {
  const source = (id: string, name: string) => ({ id, name, values: [] });

  it('should name only the given sources, in palette order, with what they stand for', () => {
    const text = describeSources([
      source('mri', 'MRI/JMA'),
      source('noaa', 'NOAA'),
      source('iap', 'IAP'),
    ]);

    expect(text).toBe(
      'IAP (Institute of Atmospheric Physics, Chinese Academy of Sciences), ' +
        'NOAA (National Centers for Environmental Information), and ' +
        'MRI/JMA (Meteorological Research Institute, Japan Meteorological Agency)',
    );
    expect(text).not.toContain('CSIRO');
  });

  it('should print an unknown source by its name alone', () => {
    expect(describeSources([source('zzz', 'New group')])).toBe('New group');
  });
});

describe('sourceSpan', () => {
  it('should find the first and last year with a value', () => {
    expect(sourceSpan({ values: [null, 1, null, 2, null] }, 2000)).toEqual({
      from: 2001,
      to: 2003,
    });
    expect(sourceSpan({ values: [1, 2, 3] }, 2000)).toEqual({ from: 2000, to: 2002 });
  });

  it('should return nothing for a source without values', () => {
    expect(sourceSpan({ values: [null, null] }, 2000)).toBeUndefined();
  });
});

describe('formatHeatContent', () => {
  it('should use one or two decimals and the real minus sign', () => {
    expect(formatHeatContent(12)).toBe('12.0');
    expect(formatHeatContent(-7.5674334)).toBe('−7.57');
    expect(formatHeatContent(0.25)).toBe('0.25');
  });
});

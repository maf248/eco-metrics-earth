import {
  buildOceanSeaLevelOption,
  formatSeaLevel,
  seaLevelEndNote,
} from '@/lib/oceanSeaLevelChartOption';

import { findColorStrings } from '../fixtures/colorStrings';
import { OCEAN_SEA_LEVEL_FIXTURE } from '../fixtures/oceanHealth';

interface Series {
  name: string;
  data: [string, number][];
  showSymbol: boolean;
}

interface Option {
  aria: { label: { description: string } };
  legend: { show: boolean };
  tooltip: {
    formatter: (
      params: { marker: string; seriesName: string; value: [string, number] }[],
    ) => string;
  };
  xAxis: { type: string };
  yAxis: { scale: boolean };
  series: Series[];
}

const build = () => buildOceanSeaLevelOption(OCEAN_SEA_LEVEL_FIXTURE) as unknown as Option;

describe('buildOceanSeaLevelOption', () => {
  it('should draw one line per mission, in payload order, on a time axis', () => {
    const option = build();

    expect(option.series.map(({ name }) => name)).toEqual([
      'TOPEX/Poseidon',
      'Jason-3',
      'Sentinel-6MF',
    ]);
    expect(option.xAxis.type).toBe('time');
  });

  it('should pair each date with its value and draw no symbols', () => {
    const [first] = build().series;

    expect(first.data).toEqual([
      ['1992-12-17', -19.33],
      ['1993-01-15', -24.03],
    ]);
    expect(build().series.every(({ showSymbol }) => !showSymbol)).toBe(true);
  });

  it('should show the legend and draw no zero line', () => {
    const option = build();

    expect(option.legend.show).toBe(true);
    expect(JSON.stringify(option)).not.toContain('markLine');
  });

  it('should let the value axis follow the data', () => {
    expect(build().yAxis.scale).toBe(true);
  });

  it('should print the date and each mission value in the tooltip', () => {
    const text = build().tooltip.formatter([
      { marker: '', seriesName: 'Jason-3', value: ['2025-01-18', 103.2] },
      { marker: '', seriesName: 'Sentinel-6MF', value: ['2025-01-18', 103.1] },
    ]);

    expect(text).toBe('18 Jan 2025<br/>Jason-3: 103.2 mm<br/>Sentinel-6MF: 103.1 mm');
  });

  it('should print No data for an empty tooltip', () => {
    expect(build().tooltip.formatter([])).toBe('No data');
  });

  it('should set its own aria description with the span and the missions', () => {
    const { description } = build().aria.label;

    expect(description).toContain('17 Dec 1992 to 15 Feb 2025');
    expect(description).toContain('TOPEX/Poseidon, Jason-3, Sentinel-6MF');
  });

  it('should name no color', () => {
    expect(findColorStrings(build())).toEqual([]);
  });
});

describe('seaLevelEndNote', () => {
  it('should name the month of the end date, in UTC', () => {
    expect(seaLevelEndNote({ endDate: '2025-02-15' }, '2026-11-24T08:00:00.000Z')).toEqual({
      month: 'February 2025',
      current: false,
    });
    expect(seaLevelEndNote({ endDate: '2025-03-01' }, '2026-11-24T08:00:00.000Z').month).toBe(
      'March 2025',
    );
  });

  it('should call a recent end date current', () => {
    expect(seaLevelEndNote({ endDate: '2026-11-10' }, '2026-11-24T08:00:00.000Z')).toEqual({
      month: 'November 2026',
      current: true,
    });
  });
});

describe('formatSeaLevel', () => {
  it('should use one or two decimals and the real minus sign', () => {
    expect(formatSeaLevel(103.2)).toBe('103.2');
    expect(formatSeaLevel(-19.33)).toBe('−19.33');
  });
});

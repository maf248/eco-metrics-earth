import {
  buildOceanPhOption,
  formatPh,
  PH_MONTHLY_LABEL,
  PH_ROLLING_LABEL,
} from '@/lib/oceanPhChartOption';

import { findColorStrings } from '../fixtures/colorStrings';
import { OCEAN_PH_FIXTURE } from '../fixtures/oceanHealth';

interface Series {
  name: string;
  data: [string, number | null][];
  lineStyle: { width: number };
  symbol?: string;
  showSymbol?: boolean;
  z?: number;
  connectNulls: boolean;
}

interface Option {
  aria: { label: { description: string } };
  tooltip: {
    formatter: (
      params: { marker: string; seriesName: string; value: [string, number | null] }[],
    ) => string;
  };
  xAxis: { type: string };
  yAxis: { scale: boolean; min?: number };
  series: Series[];
}

const build = () => buildOceanPhOption(OCEAN_PH_FIXTURE) as unknown as Option;

describe('buildOceanPhOption', () => {
  it('should draw the monthly values as markers without a connecting line', () => {
    const [monthly] = build().series;

    expect(monthly.name).toBe(PH_MONTHLY_LABEL);
    expect(monthly.symbol).toBe('circle');
    expect(monthly.lineStyle.width).toBe(0);
  });

  it('should draw the rolling average as a line after the markers, on top of them', () => {
    const [monthly, rolling] = build().series;

    expect(rolling.name).toBe(PH_ROLLING_LABEL);
    expect(rolling.showSymbol).toBe(false);
    expect(rolling.lineStyle.width).toBeGreaterThan(0);
    expect(rolling.z).toBeGreaterThan(monthly.z ?? 2);
  });

  it('should pair each date with its value and keep missing values as null, never zero', () => {
    const [monthly, rolling] = build().series;

    expect(monthly.data[2]).toEqual(['1990-01-08', null]);
    expect(rolling.data.slice(0, 2)).toEqual([
      ['1988-10-31', null],
      ['1988-12-02', null],
    ]);
    expect(rolling.data[2]).toEqual(['1990-01-08', 8.11]);
    expect(rolling.connectNulls).toBe(false);
  });

  it('should let the value axis follow the data on a time axis', () => {
    const { xAxis, yAxis } = build();

    expect(xAxis.type).toBe('time');
    expect(yAxis.scale).toBe(true);
    expect(yAxis.min).toBeUndefined();
  });

  it('should print the date and the values that exist in the tooltip', () => {
    const text = build().tooltip.formatter([
      { marker: '', seriesName: PH_MONTHLY_LABEL, value: ['2024-12-20', 8.0391] },
      { marker: '', seriesName: PH_ROLLING_LABEL, value: ['2024-12-20', null] },
    ]);

    expect(text).toBe('20 Dec 2024<br/>Monthly measurement: 8.039 pH');
  });

  it('should print No data when neither series has a value', () => {
    expect(
      build().tooltip.formatter([
        { marker: '', seriesName: PH_MONTHLY_LABEL, value: ['1990-01-08', null] },
      ]),
    ).toBe('No data');
  });

  it('should set its own aria description with the station and the span', () => {
    const { description } = build().aria.label;

    expect(description).toContain('Ocean pH at Hawaii');
    expect(description).toContain('31 Oct 1988 to 20 Dec 2024');
    expect(description).not.toContain('NaN');
  });

  it('should name no color', () => {
    expect(findColorStrings(build())).toEqual([]);
  });
});

describe('formatPh', () => {
  it('should use three decimals', () => {
    expect(formatPh(8.1097)).toBe('8.110');
    expect(formatPh(8)).toBe('8.000');
  });
});

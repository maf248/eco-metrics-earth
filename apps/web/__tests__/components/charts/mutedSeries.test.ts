import { applyMutedRole, hasMutedSeries } from '../../../src/components/charts/mutedSeries';

const OPTION = {
  xAxis: { type: 'category', data: ['a', 'b'] },
  series: [
    { type: 'line', name: 'Earlier', data: [1, 2], muted: true, lineStyle: { width: 1 } },
    { type: 'line', name: 'Current', data: [3, 4], lineStyle: { width: 2 } },
  ],
};

describe('hasMutedSeries', () => {
  it('should detect a flagged series', () => {
    expect(hasMutedSeries(OPTION)).toBe(true);
  });

  it('should ignore unflagged and falsy flags', () => {
    expect(hasMutedSeries({ series: [{ type: 'line' }, { type: 'line', muted: false }] })).toBe(
      false,
    );
  });

  it('should accept a single series object and no series', () => {
    expect(hasMutedSeries({ series: { type: 'line', muted: true } })).toBe(true);
    expect(hasMutedSeries({})).toBe(false);
  });
});

describe('applyMutedRole', () => {
  it('should give flagged series the muted color and keep their own style', () => {
    const { series } = applyMutedRole(OPTION, 'rgba(1, 2, 3, 1)') as {
      series: Record<string, unknown>[];
    };

    expect(series[0]).toMatchObject({
      color: 'rgba(1, 2, 3, 1)',
      itemStyle: { color: 'rgba(1, 2, 3, 1)' },
      lineStyle: { width: 1, color: 'rgba(1, 2, 3, 1)' },
    });
  });

  it('should drop the flag, which ECharts does not know', () => {
    const { series } = applyMutedRole(OPTION, 'rgba(1, 2, 3, 1)') as {
      series: Record<string, unknown>[];
    };

    expect(series[0]).not.toHaveProperty('muted');
  });

  it('should leave unflagged series untouched', () => {
    const { series } = applyMutedRole(OPTION, 'rgba(1, 2, 3, 1)') as {
      series: Record<string, unknown>[];
    };

    expect(series[1]).toEqual(OPTION.series[1]);
  });

  it('should not mutate the option it was given', () => {
    const before = JSON.stringify(OPTION);

    applyMutedRole(OPTION, 'rgba(1, 2, 3, 1)');

    expect(JSON.stringify(OPTION)).toBe(before);
  });

  it('should keep the other keys of the option', () => {
    expect(applyMutedRole(OPTION, 'rgba(1, 2, 3, 1)')).toHaveProperty('xAxis', OPTION.xAxis);
  });
});

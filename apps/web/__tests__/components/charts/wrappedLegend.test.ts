import { legendHeight, legendRows, wrappedLegend } from '@/components/charts/wrappedLegend';

const LABELS = [
  'Coal',
  'Gas',
  'Oil',
  'Nuclear',
  'Hydro',
  'Wind',
  'Solar',
  'Bioenergy & other renewables',
];

const reserveGrid = (height: number) => ({ grid: { bottom: height } });

describe('legendRows', () => {
  it('should fit every label on one row when the chart is wide', () => {
    expect(legendRows(LABELS, 1280)).toBe(1);
  });

  it('should need more rows as the chart narrows, never fewer', () => {
    let previous = 1;
    for (let width = 1280; width >= 100; width -= 10) {
      const rows = legendRows(LABELS, width);
      expect(rows).toBeGreaterThanOrEqual(previous);
      previous = rows;
    }
    expect(legendRows(LABELS, 330)).toBe(3);
  });

  it('should put each label on its own row when nothing else fits', () => {
    expect(legendRows(LABELS, 1)).toBe(LABELS.length);
  });

  it('should never estimate a label narrower than DejaVu Sans draws it at 12 px', () => {
    // Widths measured in Chromium, WebKit and Firefox; DejaVu Sans is the widest common sans-serif.
    const measured: Record<string, number> = { Gas: 23, Wind: 30, Hydro: 36, Nuclear: 46 };
    measured['Bioenergy & other renewables'] = 182;
    for (const [label, width] of Object.entries(measured)) {
      // Two items (icon 25 + gap 5 + text), the item gap and the padding: ECharts needs
      // two rows one pixel below this width, so the estimate must too.
      const fitsOneRow = 2 * (25 + 5 + width) + 8 + 2 * 5;
      expect(legendRows([label, label], fitsOneRow - 1)).toBe(2);
    }
  });
});

describe('legendHeight', () => {
  it('should add one row and one gap per extra row', () => {
    expect(legendHeight(1)).toBe(24);
    expect(legendHeight(2)).toBe(46);
    expect(legendHeight(3)).toBe(68);
  });
});

describe('wrappedLegend', () => {
  it('should build a plain legend at the bottom with explicit geometry', () => {
    const { legend } = wrappedLegend(LABELS, reserveGrid);

    expect(legend).toEqual({
      type: 'plain',
      show: true,
      left: 'center',
      bottom: 0,
      padding: 5,
      itemGap: 8,
      itemWidth: 25,
      itemHeight: 14,
      icon: 'roundRect',
    });
  });

  it('should reserve one row at the root', () => {
    expect(wrappedLegend(LABELS, reserveGrid).reserved).toEqual({ grid: { bottom: 24 } });
  });

  it('should start the media list with a query-less one-row default, so widening reverts to it', () => {
    const { media, reserved } = wrappedLegend(LABELS, reserveGrid);

    expect(media[0]).toEqual({ option: reserved });
  });

  it('should add one media query per extra row, widest first, each reserving more', () => {
    const queries = wrappedLegend(LABELS, reserveGrid).media.slice(1);

    expect(queries).toHaveLength(LABELS.length - 1);
    queries.slice(1).forEach((entry, index) => {
      expect(entry.query?.maxWidth).toBeLessThanOrEqual(queries[index].query?.maxWidth ?? 0);
      expect(entry.option.grid.bottom).toBeGreaterThan(queries[index].option.grid.bottom);
    });
  });

  it('should place each breakpoint at the last width that still needs those rows', () => {
    const queries = wrappedLegend(LABELS, reserveGrid).media.slice(1);

    queries.forEach(({ query }, index) => {
      const maxWidth = query?.maxWidth ?? 0;
      const rows = index + 2;
      expect(legendRows(LABELS, maxWidth)).toBeGreaterThanOrEqual(rows);
      expect(legendRows(LABELS, maxWidth + 1)).toBeLessThan(rows);
    });
  });

  it('should need only the default entry for a single label', () => {
    expect(wrappedLegend(['Coal'], reserveGrid).media).toEqual([
      { option: { grid: { bottom: 24 } } },
    ]);
  });
});

import { render, screen } from '@testing-library/react';

import { ChartSkeleton } from '@/components/charts/ChartSkeleton';
import { LazyBarEChart } from '@/components/charts/LazyBarEChart';

// The real chart needs layout and a canvas; this suite only checks the lazy hand-over.
jest.mock('@/components/charts/EBarChart', () => ({
  EChart: ({ className, palette }: { className?: string; palette?: string }) => (
    <div data-testid="bars-loaded" className={className} data-palette={palette} />
  ),
}));

describe('LazyBarEChart', () => {
  it('should show a skeleton, then the bars with their palette', async () => {
    render(<LazyBarEChart option={{}} palette="wasteTreatment" rows={3} />);

    const skeleton = screen.getByTestId('chart-skeleton');
    // Shaped like horizontal bars: a label and three stacked segments per row.
    expect(skeleton.querySelectorAll('rect')).toHaveLength(3 * 4);
    expect(skeleton.className).toContain('--bars-h');
    expect(await screen.findByTestId('bars-loaded')).toHaveAttribute(
      'data-palette',
      'wasteTreatment',
    );
  });

  it.each([
    [1, 4],
    [10, 40],
  ])('should draw %i placeholder bars (cycling past the samples)', (rows, rects) => {
    render(<ChartSkeleton variant="bars" rows={rows} />);

    expect(screen.getByTestId('chart-skeleton').querySelectorAll('rect')).toHaveLength(rects);
  });
});

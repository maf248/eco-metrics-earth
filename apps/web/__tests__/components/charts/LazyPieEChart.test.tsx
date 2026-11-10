import { render, screen } from '@testing-library/react';

import { LazyPieEChart } from '@/components/charts/LazyPieEChart';

// The real chart needs layout and a canvas; this suite only checks the lazy hand-over.
jest.mock('@/components/charts/EPieChart', () => ({
  EChart: ({ className, palette }: { className?: string; palette?: string }) => (
    <div data-testid="pie-loaded" className={className} data-palette={palette} />
  ),
}));

describe('LazyPieEChart', () => {
  it('should show a skeleton with the chart height, then the pie in a container of the same height', async () => {
    render(<LazyPieEChart option={{}} palette="energyMix" />);

    expect(screen.getByTestId('chart-skeleton')).toHaveClass('h-96', '-mx-4', 'sm:mx-0');

    const pie = await screen.findByTestId('pie-loaded');
    expect(pie).toHaveClass('h-96', '-mx-4', 'sm:mx-0');
    expect(pie).toHaveAttribute('data-palette', 'energyMix');
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';

import { baseChartOption } from '@/components/charts/baseChartOption';
import { ChartSkeleton, CHART_HEIGHT_CLASS_NAME } from '@/components/charts/ChartSkeleton';
import { LazyEChart } from '@/components/charts/LazyEChart';

// The real chart needs layout and a canvas; this suite only checks the lazy hand-over.
jest.mock('@/components/charts/EChart', () => ({
  EChart: ({ className, palette }: { className?: string; palette?: string }) => (
    <div data-testid="chart-loaded" className={className} data-palette={palette} />
  ),
}));

describe('LazyEChart', () => {
  it('should show a skeleton with the chart height, then the chart in a container of the same height', async () => {
    render(<LazyEChart option={{}} />);

    const skeleton = screen.getByTestId('chart-skeleton');
    expect(skeleton).toHaveClass('h-72', 'sm:h-96');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');

    const chart = await screen.findByTestId('chart-loaded');
    expect(chart).toHaveClass('h-72', 'sm:h-96');
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
  });
});

describe('LazyEChart palette', () => {
  it('should hand the palette to the chart', async () => {
    render(<LazyEChart option={{}} palette="energyMix" />);

    expect(await screen.findByTestId('chart-loaded')).toHaveAttribute('data-palette', 'energyMix');
  });
});

describe('ChartSkeleton', () => {
  it('should use the same height classes as the chart container', () => {
    render(<ChartSkeleton />);

    expect(CHART_HEIGHT_CLASS_NAME).toBe('h-72 sm:h-96');
    expect(screen.getByTestId('chart-skeleton')).toHaveClass(...CHART_HEIGHT_CLASS_NAME.split(' '));
  });
});

describe('baseChartOption', () => {
  it('should provide mobile-safe, accessible defaults', () => {
    const option = baseChartOption() as {
      tooltip: { confine: boolean };
      aria: { enabled: boolean };
      legend: { type: string };
      grid: { containLabel: boolean };
      xAxis: { axisLabel: { hideOverlap: boolean } };
      yAxis: { axisLabel: { hideOverlap: boolean } };
    };

    expect(option.tooltip.confine).toBe(true);
    expect(option.aria.enabled).toBe(true);
    expect(option.legend.type).toBe('scroll');
    expect(option.grid.containLabel).toBe(true);
    expect(option.xAxis.axisLabel.hideOverlap).toBe(true);
    expect(option.yAxis.axisLabel.hideOverlap).toBe(true);
  });
});

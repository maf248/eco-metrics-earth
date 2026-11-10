import { render, screen } from '@testing-library/react';

import { ChartPanel } from '@/components/charts/ChartPanel';

const received: unknown[] = [];
const palettes: unknown[] = [];

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option, palette }: { option: unknown; palette?: string }) => {
    received.push(option);
    palettes.push(palette);
    return <div data-testid="chart-stub" />;
  },
}));

describe('ChartPanel', () => {
  beforeEach(() => {
    received.length = 0;
    palettes.length = 0;
  });

  it('should render the title as an h3 above the chart', () => {
    render(<ChartPanel title="World: a thing" option={{ marker: 1 }} announcement="Showing it" />);

    expect(screen.getByRole('heading', { level: 3, name: 'World: a thing' })).toBeInTheDocument();
    expect(screen.getByTestId('chart-stub')).toBeInTheDocument();
  });

  it('should hand the option to the lazy chart', () => {
    const option = { marker: 1 };

    render(<ChartPanel title="t" option={option} announcement="a" />);

    expect(received).toEqual([option]);
  });

  it('should announce the selection in a polite live region', () => {
    render(<ChartPanel title="t" option={{}} announcement="Showing it for Argentina" />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Showing it for Argentina');
    expect(status).toHaveClass('sr-only');
  });

  it('should pass the palette through to the chart, and leave it unset by default', () => {
    const { rerender } = render(<ChartPanel title="t" option={{}} announcement="a" />);
    rerender(<ChartPanel title="t" option={{}} announcement="a" palette="energyMix" />);

    expect(palettes).toEqual([undefined, 'energyMix']);
  });
});

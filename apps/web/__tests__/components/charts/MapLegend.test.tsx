import { render, screen } from '@testing-library/react';

import { MapLegend } from '@/components/charts/MapLegend';

describe('MapLegend', () => {
  it('should list each class and then "No data", named for assistive technology', () => {
    render(<MapLegend classLabels={['< 1 t', '≥ 1 t']} label="Legend: tonnes" />);
    const list = screen.getByRole('list', { name: 'Legend: tonnes' });
    expect(list.textContent).toBe('< 1 t≥ 1 tNo data');
  });

  it('should paint swatches from the sequential tokens and the no-data token', () => {
    const { container } = render(<MapLegend classLabels={['a', 'b']} label="Legend" />);
    const swatches = [...container.querySelectorAll('[data-token]')];
    expect(swatches.map((swatch) => swatch.getAttribute('data-token'))).toEqual([
      'chart-seq-1',
      'chart-seq-2',
      'chart-no-data',
    ]);
    expect(swatches[0]).toHaveStyle({ background: 'var(--chart-seq-1)' });
    expect(swatches[0]).toHaveAttribute('aria-hidden', 'true');
  });
});

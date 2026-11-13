import { render, screen } from '@testing-library/react';
import { createRef } from 'react';

import { ScrollRegion } from '@/components/ScrollRegion';

describe('ScrollRegion', () => {
  it('should be a region named by its label plus ", scrollable"', () => {
    render(<ScrollRegion label="Countries ranked">content</ScrollRegion>);

    expect(screen.getByRole('region', { name: 'Countries ranked, scrollable' })).toHaveTextContent(
      'content',
    );
  });

  it('should be reachable by keyboard', () => {
    render(<ScrollRegion label="Table">content</ScrollRegion>);

    expect(screen.getByRole('region')).toHaveAttribute('tabindex', '0');
  });

  it('should expose the test id', () => {
    render(
      <ScrollRegion label="Table" testId="region">
        content
      </ScrollRegion>,
    );

    expect(screen.getByTestId('region')).toBe(screen.getByRole('region'));
  });

  it('should forward the ref to the region element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ScrollRegion label="Table" ref={ref}>
        content
      </ScrollRegion>,
    );

    expect(ref.current).toBe(screen.getByRole('region'));
  });

  it('should merge the layout classes with the always-scrolling region classes', () => {
    render(
      <ScrollRegion label="Table" className="max-h-96">
        content
      </ScrollRegion>,
    );

    const region = screen.getByRole('region');
    expect(region).toHaveClass('max-h-96', 'overflow-auto', 'border-line-strong');
  });
});

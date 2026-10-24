import { render, screen, within } from '@testing-library/react';

import { Footer } from '@/components/Footer';

describe('Footer', () => {
  it('should render a single contentinfo landmark', () => {
    render(<Footer />);

    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  });

  it('should contain exactly one link, to the data sources page', () => {
    render(<Footer />);

    const links = within(screen.getByRole('contentinfo')).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Data sources');
    // next/link strips the trailing slash in jsdom.
    expect(links[0]).toHaveAttribute('href', '/data-sources');
  });

  it('should show the brand, tagline and signature', () => {
    render(<Footer />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('~ eco-metrics.earth');
    expect(footer).toHaveTextContent('Environmental data, made readable.');
    expect(footer).toHaveTextContent('© 2026 eco-metrics earth · by maf248');
  });

  it('should keep the shell prompt out of the accessibility tree', () => {
    render(<Footer />);

    const link = screen.getByRole('link', { name: 'Data sources' });
    expect(link).toHaveTextContent('data-sources/');
    expect(link.parentElement?.querySelector('[aria-hidden="true"]')).toHaveTextContent('$ cd');
  });

  it('should underline the link and apply the project focus ring', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: 'Data sources' })).toHaveClass(
      'underline',
      'focus-visible:ring-2',
      'focus-visible:ring-focus-ring',
      'focus-visible:ring-offset-2',
      'ring-offset-focus-offset',
    );
  });

  it('should stay in document flow', () => {
    render(<Footer />);

    expect(screen.getByRole('contentinfo').className).not.toMatch(/\b(fixed|sticky)\b/);
  });
});

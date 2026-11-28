import { render, screen, within } from '@testing-library/react';

import { Footer } from '@/components/Footer';
import { NAV_ITEMS } from '@/lib/navItems';

describe('Footer', () => {
  it('should render a single contentinfo landmark', () => {
    render(<Footer />);

    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  });

  it('should contain exactly two links, to the data sources and privacy pages', () => {
    render(<Footer />);

    const links = within(screen.getByRole('contentinfo')).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAccessibleName('Data sources');
    // next/link strips the trailing slash in jsdom.
    expect(links[0]).toHaveAttribute('href', '/data-sources');
    expect(links[1]).toHaveAccessibleName('Privacy');
    expect(links[1]).toHaveAttribute('href', '/privacy');
  });

  it('should show the brand, tagline and signature', () => {
    render(<Footer />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('~ eco-metrics.earth');
    expect(footer).toHaveTextContent('Environmental data, made readable.');
    expect(footer).toHaveTextContent('© 2026 eco-metrics earth · by maf248 · Privacy');
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

  it('should place the Privacy link in the bottom line with the link and focus classes', () => {
    render(<Footer />);

    const link = screen.getByRole('link', { name: 'Privacy' });
    expect(link.parentElement).toHaveTextContent('© 2026 eco-metrics earth · by maf248 · Privacy');
    expect(link.parentElement).toHaveClass('text-xs');
    expect(link).toHaveClass('underline', 'focus-visible:ring-2', 'focus-visible:ring-focus-ring');
    expect(link.className).not.toMatch(/\btext-(xs|sm|base|lg)\b/);
  });

  it('should not list Privacy in the main navigation items', () => {
    const entries = NAV_ITEMS.map(({ slug, label, href }) => `${slug} ${label} ${href}`);
    expect(entries.join(' ').toLowerCase()).not.toContain('privacy');
  });

  it('should stay in document flow', () => {
    render(<Footer />);

    expect(screen.getByRole('contentinfo').className).not.toMatch(/\b(fixed|sticky)\b/);
  });
});

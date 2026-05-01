import React from 'react';
import { render, screen } from '@testing-library/react';

import { ECO_CATEGORIES } from '@eco-metrics/shared';

import Navbar from '../../src/components/Navbar';
import { getCategoryTitle } from '../../src/lib/categoryTitle';

const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('Navbar', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  it('should render a <nav> landmark', () => {
    render(<Navbar />);
    expect(screen.getByRole('navigation')).toBeTruthy();
  });

  it('should have an accessible label "Main navigation"', () => {
    render(<Navbar />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
  });

  it('should render exactly one link per ECO_CATEGORY', () => {
    render(<Navbar />);
    const links = screen.getAllByRole('link');
    const categoryCount = Object.values(ECO_CATEGORIES).length;
    expect(links).toHaveLength(categoryCount);
  });

  it('should render each link with the correct href', () => {
    render(<Navbar />);
    const links = screen.getAllByRole('link');
    const renderedHrefs = links.map((l) => l.getAttribute('href'));

    // next/link strips trailing slashes in jsdom — assert the normalized form
    Object.values(ECO_CATEGORIES).forEach((slug) => {
      expect(renderedHrefs).toContain(`/${slug}`);
    });
  });

  it('should render the human-readable label for each link', () => {
    render(<Navbar />);
    Object.values(ECO_CATEGORIES).forEach((slug) => {
      expect(screen.getByText(getCategoryTitle(slug))).toBeTruthy();
    });
  });

  it('should mark only the active link with aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/air-quality/');
    render(<Navbar />);

    const allLinks = screen.getAllByRole('link');
    const activeLinks = allLinks.filter((l) => l.getAttribute('aria-current') === 'page');

    expect(activeLinks).toHaveLength(1);
    // next/link strips trailing slashes in jsdom — assert the normalized form
    expect(activeLinks[0].getAttribute('href')).toBe('/air-quality');
  });

  it('should NOT mark inactive links with aria-current', () => {
    mockUsePathname.mockReturnValue('/air-quality/');
    render(<Navbar />);

    const allLinks = screen.getAllByRole('link');
    // next/link strips trailing slashes in jsdom — filter by normalized href
    const inactiveLinks = allLinks.filter((l) => l.getAttribute('href') !== '/air-quality');

    inactiveLinks.forEach((link) => {
      expect(link.getAttribute('aria-current')).toBeNull();
    });
  });

  it('should update the active link when the pathname changes', () => {
    mockUsePathname.mockReturnValue('/ocean-health/');
    render(<Navbar />);

    const allLinks = screen.getAllByRole('link');
    const activeLinks = allLinks.filter((l) => l.getAttribute('aria-current') === 'page');

    expect(activeLinks).toHaveLength(1);
    // next/link strips trailing slashes in jsdom — assert the normalized form
    expect(activeLinks[0].getAttribute('href')).toBe('/ocean-health');
  });
});

import { ECO_CATEGORIES } from '@eco-metrics/shared';
import { render, screen, within } from '@testing-library/react';

import Navbar from '@/components/Navbar';
import { getCategoryTitle } from '@/lib/categoryTitle';

const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

// BrandText (used in Navbar's desktop brand link) calls window.matchMedia
// jsdom does not implement it — provide a mock for all tests in this file
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

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
    // Scope to the <ul role="list"> to exclude the brand link (href="/")
    const navList = screen.getByRole('list');
    const links = within(navList).getAllByRole('link');
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

  it('should render a brand link to the home page', () => {
    render(<Navbar />);
    const brandLink = screen.getByRole('link', { name: /eco-metrics earth/i });
    expect(brandLink.getAttribute('href')).toBe('/');
  });

  it('should have desktop sidebar width lg:w-76', () => {
    render(<Navbar />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('lg:w-76');
  });
});

describe('Navbar snapshots', () => {
  it('should match snapshot with no active route', () => {
    mockUsePathname.mockReturnValue('/');
    const { asFragment } = render(<Navbar />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should match snapshot with an active route', () => {
    mockUsePathname.mockReturnValue('/air-quality/');
    const { asFragment } = render(<Navbar />);
    expect(asFragment()).toMatchSnapshot();
  });
});

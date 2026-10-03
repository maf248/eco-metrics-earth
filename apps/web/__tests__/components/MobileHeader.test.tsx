import { render, screen } from '@testing-library/react';

import MobileHeader from '@/components/MobileHeader';

// BrandText calls window.matchMedia — mock it for all tests in this file
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

// ─── Landmark semantics ───────────────────────────────────────────────────────

describe('MobileHeader — landmark semantics', () => {
  it('should render a <header> element', () => {
    const { container } = render(<MobileHeader />);
    expect(container.querySelector('header')).not.toBeNull();
  });

  it('should have aria-label="Site header" on the <header>', () => {
    const { container } = render(<MobileHeader />);
    expect(container.querySelector('header')?.getAttribute('aria-label')).toBe('Site header');
  });

  it('should include lg:hidden so it is hidden on desktop', () => {
    const { container } = render(<MobileHeader />);
    expect(container.querySelector('header')?.className).toContain('lg:hidden');
  });

  it('should be fixed to the top of the viewport', () => {
    const { container } = render(<MobileHeader />);
    const header = container.querySelector('header');
    expect(header?.className).toContain('fixed');
    expect(header?.className).toContain('top-0');
  });

  it('should have h-14 height', () => {
    const { container } = render(<MobileHeader />);
    expect(container.querySelector('header')?.className).toContain('h-14');
  });
});

// ─── Home link ────────────────────────────────────────────────────────────────

describe('MobileHeader — home link', () => {
  it('should render a link to home', () => {
    render(<MobileHeader />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/');
  });

  it('should have aria-label "eco-metrics earth — go to home"', () => {
    render(<MobileHeader />);
    expect(screen.getByRole('link', { name: 'eco-metrics earth — go to home' })).toBeTruthy();
  });

  it('should span the full header height (h-full)', () => {
    render(<MobileHeader />);
    expect(screen.getByRole('link').className).toContain('h-full');
  });
});

// ─── Site logo ────────────────────────────────────────────────────────────────

describe('MobileHeader — site logo', () => {
  it('should render an SVG inside the header', () => {
    const { container } = render(<MobileHeader />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('should render the logo with aria-hidden="true"', () => {
    const { container } = render(<MobileHeader />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

// ─── BrandText integration ────────────────────────────────────────────────────

describe('MobileHeader — BrandText integration', () => {
  it('should render the cursor character ▋ from BrandText', () => {
    const { container } = render(<MobileHeader />);
    expect(container.textContent).toContain('▋');
  });

  it('should render the [↵] affordance from BrandText', () => {
    const { container } = render(<MobileHeader />);
    expect(container.textContent).toContain('[↵]');
  });
});

// ─── Snapshot ─────────────────────────────────────────────────────────────────

describe('MobileHeader snapshots', () => {
  it('should match snapshot', () => {
    const { asFragment } = render(<MobileHeader />);
    expect(asFragment()).toMatchSnapshot();
  });
});

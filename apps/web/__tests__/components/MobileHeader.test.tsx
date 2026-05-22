import { act, render, screen } from '@testing-library/react';

import MobileHeader from '../../src/components/MobileHeader';

// ─── matchMedia mock ──────────────────────────────────────────────────────────
// jsdom does not implement window.matchMedia — provide a configurable mock.

function mockMatchMedia(prefersReducedMotion: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? prefersReducedMotion : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  // Default: no reduced motion preference
  mockMatchMedia(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
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
    // next/link strips trailing slash in jsdom
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

// ─── Typewriter animation (normal motion) ─────────────────────────────────────

describe('MobileHeader — typewriter animation (no reduced motion)', () => {
  it('should start with empty brand text before any tick', () => {
    const { container } = render(<MobileHeader />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const brandSpan = spans[0]; // first span is the brand text
    expect(brandSpan.textContent).toBe('');
  });

  it('should reveal characters progressively as interval ticks', () => {
    const { container } = render(<MobileHeader />);
    const brandSpan = container.querySelectorAll('span[aria-hidden="true"]')[0];

    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(brandSpan.textContent).toBe('~');

    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(brandSpan.textContent).toBe('~ ');

    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(brandSpan.textContent).toBe('~ e');
  });

  it('should show the full text after all characters are typed', () => {
    const { container } = render(<MobileHeader />);
    const brandSpan = container.querySelectorAll('span[aria-hidden="true"]')[0];

    act(() => {
      jest.advanceTimersByTime(60 * 20);
    }); // 20 chars
    expect(brandSpan.textContent).toBe('~ eco-metrics.earth');
  });

  it('should have [↵] with opacity-0 before typing completes', () => {
    const { container } = render(<MobileHeader />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    // [↵] is the last aria-hidden span
    const enterSpan = spans[spans.length - 1];
    expect(enterSpan.className).toContain('opacity-0');
  });

  it('should show [↵] with opacity-100 after typing completes', () => {
    const { container } = render(<MobileHeader />);
    act(() => {
      jest.advanceTimersByTime(60 * 20);
    });
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const enterSpan = spans[spans.length - 1];
    expect(enterSpan.className).toContain('opacity-100');
  });
});

// ─── Reduced motion ───────────────────────────────────────────────────────────

describe('MobileHeader — prefers-reduced-motion: reduce', () => {
  beforeEach(() => {
    mockMatchMedia(true);
  });

  it('should show the full brand text immediately without waiting for intervals', () => {
    const { container } = render(<MobileHeader />);
    // No timer advance needed — text should be complete on mount
    const brandSpan = container.querySelectorAll('span[aria-hidden="true"]')[0];
    expect(brandSpan.textContent).toBe('~ eco-metrics.earth');
  });

  it('should show [↵] as visible (opacity-100) immediately', () => {
    const { container } = render(<MobileHeader />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const enterSpan = spans[spans.length - 1];
    expect(enterSpan.className).toContain('opacity-100');
  });
});

// ─── Accessibility of decorative elements ─────────────────────────────────────

describe('MobileHeader — decorative elements are aria-hidden', () => {
  it('should render [↵] in the DOM', () => {
    const { container } = render(<MobileHeader />);
    expect(container.textContent).toContain('[↵]');
  });

  it('should have [↵] span with aria-hidden="true"', () => {
    const { container } = render(<MobileHeader />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const enterSpan = Array.from(spans).find((s) => s.textContent?.includes('[↵]'));
    expect(enterSpan).not.toBeUndefined();
    expect(enterSpan?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should have cursor span with aria-hidden="true"', () => {
    const { container } = render(<MobileHeader />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const cursorSpan = Array.from(spans).find((s) => s.textContent?.includes('▋'));
    expect(cursorSpan?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should apply animate-cursor-blink to the cursor span', () => {
    const { container } = render(<MobileHeader />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const cursorSpan = Array.from(spans).find((s) => s.textContent?.includes('▋'));
    expect(cursorSpan?.className).toContain('animate-cursor-blink');
  });
});

// ─── Snapshot ─────────────────────────────────────────────────────────────────

describe('MobileHeader snapshots', () => {
  it('should match snapshot after typing completes (normal motion)', () => {
    const { asFragment } = render(<MobileHeader />);
    act(() => {
      jest.advanceTimersByTime(60 * 20);
    });
    expect(asFragment()).toMatchSnapshot();
  });

  it('should match snapshot with reduced motion (full text, no animation)', () => {
    mockMatchMedia(true);
    const { asFragment } = render(<MobileHeader />);
    expect(asFragment()).toMatchSnapshot();
  });
});

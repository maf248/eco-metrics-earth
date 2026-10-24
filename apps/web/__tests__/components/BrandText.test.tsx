import { act, render } from '@testing-library/react';

import BrandText from '@/components/BrandText';

// ─── matchMedia mock ──────────────────────────────────────────────────────────

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
  mockMatchMedia(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

// ─── Typewriter animation (normal motion) ─────────────────────────────────────

describe('BrandText — typewriter animation (no reduced motion)', () => {
  it('should start with empty text before any tick', () => {
    const { container } = render(<BrandText />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    expect(spans[0].textContent).toBe('');
  });

  it('should reveal characters progressively as interval ticks', () => {
    const { container } = render(<BrandText />);
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
    const { container } = render(<BrandText />);
    const brandSpan = container.querySelectorAll('span[aria-hidden="true"]')[0];
    act(() => {
      jest.advanceTimersByTime(60 * 20);
    });
    expect(brandSpan.textContent).toBe('~ eco-metrics.earth');
  });

  it('should have [↵] with opacity-0 before typing completes', () => {
    const { container } = render(<BrandText />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const enterSpan = spans[spans.length - 1];
    expect(enterSpan.className).toContain('opacity-0');
  });

  it('should show [↵] with opacity-100 after typing completes', () => {
    const { container } = render(<BrandText />);
    act(() => {
      jest.advanceTimersByTime(60 * 20);
    });
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const enterSpan = spans[spans.length - 1];
    expect(enterSpan.className).toContain('opacity-100');
  });
});

// ─── Reduced motion ───────────────────────────────────────────────────────────

describe('BrandText — prefers-reduced-motion: reduce', () => {
  beforeEach(() => {
    mockMatchMedia(true);
  });

  it('should show the full brand text immediately', () => {
    const { container } = render(<BrandText />);
    const brandSpan = container.querySelectorAll('span[aria-hidden="true"]')[0];
    expect(brandSpan.textContent).toBe('~ eco-metrics.earth');
  });

  it('should show [↵] as visible (opacity-100) immediately', () => {
    const { container } = render(<BrandText />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const enterSpan = spans[spans.length - 1];
    expect(enterSpan.className).toContain('opacity-100');
  });
});

// ─── Decorative elements ─────────────────────────────────────────────────────

describe('BrandText — decorative elements', () => {
  it('should render [↵] in the DOM', () => {
    const { container } = render(<BrandText />);
    expect(container.textContent).toContain('[↵]');
  });

  it('should have [↵] span with aria-hidden="true"', () => {
    const { container } = render(<BrandText />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const enterSpan = Array.from(spans).find((s) => s.textContent?.includes('[↵]'));
    expect(enterSpan?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should render the cursor character ▋', () => {
    const { container } = render(<BrandText />);
    expect(container.textContent).toContain('▋');
  });

  it('should have cursor span with aria-hidden="true"', () => {
    const { container } = render(<BrandText />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const cursorSpan = Array.from(spans).find((s) => s.textContent?.includes('▋'));
    expect(cursorSpan?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should apply animate-cursor-blink to the cursor span', () => {
    const { container } = render(<BrandText />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const cursorSpan = Array.from(spans).find((s) => s.textContent?.includes('▋'));
    expect(cursorSpan?.className).toContain('animate-cursor-blink');
  });

  it('should render brand text in font-mono with the accent color token', () => {
    const { container } = render(<BrandText />);
    const brandSpan = container.querySelectorAll('span[aria-hidden="true"]')[0];
    expect(brandSpan.className).toContain('font-mono');
    expect(brandSpan.className).toContain('text-accent');
  });

  it('should have whitespace-nowrap on brand text span to prevent wrapping', () => {
    const { container } = render(<BrandText />);
    const brandSpan = container.querySelectorAll('span[aria-hidden="true"]')[0];
    expect(brandSpan.className).toContain('whitespace-nowrap');
  });
});

// ─── Snapshots ────────────────────────────────────────────────────────────────

describe('BrandText snapshots', () => {
  it('should match snapshot after typing completes (normal motion)', () => {
    const { asFragment } = render(<BrandText />);
    act(() => {
      jest.advanceTimersByTime(60 * 20);
    });
    expect(asFragment()).toMatchSnapshot();
  });

  it('should match snapshot with reduced motion', () => {
    mockMatchMedia(true);
    const { asFragment } = render(<BrandText />);
    expect(asFragment()).toMatchSnapshot();
  });
});

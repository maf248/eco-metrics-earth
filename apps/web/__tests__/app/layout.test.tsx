import { renderToString } from 'react-dom/server';

import RootLayout, { metadata } from '../../src/app/layout';

// Navbar uses NavLink which calls usePathname — mock it for SSR tests
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// MobileHeader calls window.matchMedia at render time — jsdom does not implement it
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

describe('RootLayout', () => {
  it('should be defined', () => {
    expect(RootLayout).toBeDefined();
  });

  it('should render html with lang="en" and dark mode class', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('lang="en"');
    expect(html).toContain('class="dark"');
    expect(html).toContain('test content');
  });

  it('should render the Navbar inside the layout', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('aria-label="Main navigation"');
  });

  it('should render the content wrapper with correct offset classes', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('pb-20');
    expect(html).toContain('lg:pl-72');
  });

  it('should render a skip-to-content link with href="#main-content"', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('Skip to main content');
  });

  it('should NOT assign id="main-content" to the layout wrapper div', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    // id="main-content" belongs on the <main> inside each page, not the layout wrapper
    expect(html).not.toContain('id="main-content"');
  });
});

describe('metadata', () => {
  it('should have a default title', () => {
    expect((metadata.title as { default: string }).default).toBe('eco-metrics earth');
  });

  it('should have a title template', () => {
    expect((metadata.title as { template: string }).template).toBe('%s \u2014 eco-metrics earth');
  });

  it('should have a non-empty description', () => {
    expect(typeof metadata.description).toBe('string');
    expect((metadata.description as string).length).toBeGreaterThan(0);
  });

  it('should have openGraph.siteName set to "eco-metrics earth"', () => {
    expect(metadata.openGraph?.siteName).toBe('eco-metrics earth');
  });

  it('should have twitter.card set to "summary"', () => {
    expect((metadata.twitter as { card?: string } | null | undefined)?.card).toBe('summary');
  });
});

describe('RootLayout — MobileHeader', () => {
  it('should render the MobileHeader with aria-label="Site header"', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('aria-label="Site header"');
  });

  it('should render the MobileHeader before the Navbar in the DOM', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    const headerPos = html.indexOf('aria-label="Site header"');
    const navPos = html.indexOf('aria-label="Main navigation"');
    expect(headerPos).toBeLessThan(navPos);
  });

  it('should render a home link inside the MobileHeader', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('eco-metrics earth \u2014 go to home');
  });
});

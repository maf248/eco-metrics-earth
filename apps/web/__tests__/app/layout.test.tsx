import { renderToString } from 'react-dom/server';

import RootLayout, { metadata } from '@/app/layout';
import { OG_IMAGE, SITE_DESCRIPTION } from '@/lib/socialMetadata';

// Navbar and the navigation provider read the router — mock it for SSR tests
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}));

// The Vercel components inject scripts — replace them with markers
jest.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));
jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: ({ sampleRate }: { sampleRate?: number }) => (
    <div data-testid="vercel-speed-insights" data-sample-rate={sampleRate} />
  ),
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

  it('should render html with lang="en" and ThemeProvider wrapper', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('lang="en"');
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
    expect(html).toContain('pb-bottom-nav');
    expect(html).toContain('lg:pl-76');
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

  it('should render the only <main>, the target of the skip link', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html.match(/<main/g)).toHaveLength(1);
    expect(html).toMatch(/<main[^>]*id="main-content"[^>]*tabindex="-1"/i);
  });
});

describe('RootLayout — Footer', () => {
  const html = renderToString(
    <RootLayout>
      <p>test content</p>
    </RootLayout>,
  );

  it('should render the footer inside the content wrapper, right after the children', () => {
    const wrapper = html.match(
      /<div class="pb-bottom-nav lg:pb-safe lg:pl-76">(.*)<\/div><\/body>/s,
    )?.[1];

    expect(wrapper).toMatch(/^<main.*test content.*<\/main><footer/s);
    expect(wrapper).toContain('href="/data-sources"');
  });

  it('should keep the wrapper offsets intact', () => {
    expect(html).toContain('class="pb-bottom-nav lg:pb-safe lg:pl-76"');
  });
});

describe('metadata', () => {
  it('should have a default title', () => {
    expect((metadata.title as { default: string }).default).toBe('eco-metrics earth');
  });

  it('should have a title template', () => {
    expect((metadata.title as { template: string }).template).toBe('%s | eco-metrics earth');
  });

  it('should use the shared site description within 110-160 characters', () => {
    expect(metadata.description).toBe(SITE_DESCRIPTION);
    expect((metadata.description as string).length).toBeGreaterThanOrEqual(110);
    expect((metadata.description as string).length).toBeLessThanOrEqual(160);
  });

  it('should have openGraph.siteName set to "eco-metrics earth"', () => {
    expect(metadata.openGraph?.siteName).toBe('eco-metrics earth');
  });

  it('should have twitter.card set to "summary_large_image"', () => {
    expect((metadata.twitter as { card?: string } | null | undefined)?.card).toBe(
      'summary_large_image',
    );
  });

  it('should use the PNG social card as the openGraph image', () => {
    expect((metadata.openGraph as { images?: unknown } | null | undefined)?.images).toEqual([
      OG_IMAGE,
    ]);
  });

  it('should not use the SVG logo as a social image', () => {
    expect(JSON.stringify(metadata.openGraph)).not.toContain('.svg');
    expect(JSON.stringify(metadata.twitter)).not.toContain('.svg');
  });

  it('should declare the PNG apple touch icon', () => {
    expect((metadata.icons as { apple?: string } | null | undefined)?.apple).toBe(
      '/icons/apple-touch-icon.png',
    );
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

describe('RootLayout — web analytics', () => {
  const original = process.env.VERCEL_ENV;
  const render = () =>
    renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );

  afterEach(() => {
    if (original === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = original;
    }
  });

  it('should render both components after the content wrapper in production', () => {
    process.env.VERCEL_ENV = 'production';
    const html = render();
    expect(html).toContain('data-testid="vercel-analytics"');
    expect(html).toContain('data-testid="vercel-speed-insights"');
    expect(html.indexOf('lg:pl-76')).toBeLessThan(html.indexOf('vercel-analytics'));
    expect(html.indexOf('vercel-analytics')).toBeLessThan(html.indexOf('</body>'));
  });

  it('should sample Speed Insights at 50 percent', () => {
    process.env.VERCEL_ENV = 'production';
    expect(render()).toContain('data-sample-rate="0.5"');
  });

  it('should render neither component on a preview deployment', () => {
    process.env.VERCEL_ENV = 'preview';
    const html = render();
    expect(html).not.toContain('vercel-analytics');
    expect(html).not.toContain('vercel-speed-insights');
  });

  it('should render neither component when VERCEL_ENV is unset', () => {
    delete process.env.VERCEL_ENV;
    const html = render();
    expect(html).not.toContain('vercel-analytics');
    expect(html).not.toContain('vercel-speed-insights');
  });
});

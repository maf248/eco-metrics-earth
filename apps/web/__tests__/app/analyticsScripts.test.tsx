import { render } from '@testing-library/react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

// The Next wrappers derive the route from the router and inject nothing until it is known.
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

// The Vercel packages choose their script URL at runtime from NODE_ENV, so the production
// branch is exercised by switching it for the duration of each test.
const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;

function injectedScriptSources(): string[] {
  return Array.from(document.head.querySelectorAll('script'))
    .map((script) => script.getAttribute('src') ?? '')
    .filter((src) => src.length > 0);
}

describe('Vercel analytics scripts in production mode', () => {
  beforeEach(() => {
    env.NODE_ENV = 'production';
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    document.head.querySelectorAll('script').forEach((script) => script.remove());
  });

  it('should load the Web Analytics script from the same origin', () => {
    render(<Analytics />);

    expect(injectedScriptSources()).toEqual(['/_vercel/insights/script.js']);
  });

  it('should load the Speed Insights script from the same origin when no DSN is configured', () => {
    render(<SpeedInsights sampleRate={0.5} />);

    expect(injectedScriptSources()).toEqual(['/_vercel/speed-insights/script.js']);
  });

  it('should load no script from a Vercel host in production mode', () => {
    render(
      <>
        <Analytics />
        <SpeedInsights sampleRate={0.5} />
      </>,
    );

    for (const src of injectedScriptSources()) {
      expect(src.startsWith('/')).toBe(true);
      expect(src).not.toMatch(/vercel-scripts\.com|vercel-insights\.com/);
    }
  });
});

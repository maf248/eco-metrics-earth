import { buildContentSecurityPolicy } from '@/lib/contentSecurityPolicy';

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const DSN = 'https://abc123@o1.ingest.de.sentry.io/42';

function connectSrc(csp: string): string | undefined {
  return csp.split('; ').find((directive) => directive.startsWith('connect-src'));
}

describe('buildContentSecurityPolicy', () => {
  it('should build the unchanged production policy without a DSN', () => {
    expect(buildContentSecurityPolicy({ isDev: false })).toBe(PRODUCTION_CSP);
  });

  it('should add unsafe-eval and drop upgrade-insecure-requests in development', () => {
    const csp = buildContentSecurityPolicy({ isDev: true });
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('should allow only the ingest origin of the DSN in connect-src', () => {
    const csp = buildContentSecurityPolicy({ isDev: false, sentryDsn: DSN });
    expect(connectSrc(csp)).toBe("connect-src 'self' https://o1.ingest.de.sentry.io");
    expect(csp).not.toContain('*');
  });

  it('should keep only the connect-src directive different when a DSN is set', () => {
    const withDsn = buildContentSecurityPolicy({ isDev: false, sentryDsn: DSN }).split('; ');
    const without = PRODUCTION_CSP.split('; ');
    const differing = withDsn.filter((directive, index) => directive !== without[index]);
    expect(differing).toHaveLength(1);
  });

  it.each([undefined, '', 'not a url', 'http://abc@o1.ingest.de.sentry.io/42'])(
    'should keep connect-src self for the DSN %p',
    (sentryDsn) => {
      const csp = buildContentSecurityPolicy({ isDev: false, sentryDsn });
      expect(connectSrc(csp)).toBe("connect-src 'self'");
    },
  );
});

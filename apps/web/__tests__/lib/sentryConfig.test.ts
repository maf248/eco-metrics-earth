import {
  buildSentryInitOptions,
  getSentryInitOptions,
  sentryIngestOrigin,
} from '@/lib/sentryConfig';

const DSN = 'https://abc123@o1.ingest.de.sentry.io/42';

describe('buildSentryInitOptions', () => {
  it.each([undefined, ''])('should return undefined for the DSN %p', (dsn) => {
    expect(buildSentryInitOptions({ NEXT_PUBLIC_SENTRY_DSN: dsn })).toBeUndefined();
  });

  it.each(['not a url', 'http://abc123@o1.ingest.de.sentry.io/42'])(
    'should return undefined for the unusable DSN %p',
    (dsn) => {
      expect(buildSentryInitOptions({ NEXT_PUBLIC_SENTRY_DSN: dsn })).toBeUndefined();
    },
  );

  it('should map the DSN, environment and release', () => {
    const options = buildSentryInitOptions({
      NEXT_PUBLIC_SENTRY_DSN: DSN,
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'preview',
      NEXT_PUBLIC_SENTRY_RELEASE: 'abc123',
    });
    expect(options).toMatchObject({ dsn: DSN, environment: 'preview', release: 'abc123' });
  });

  it('should leave environment and release undefined when absent', () => {
    const options = buildSentryInitOptions({ NEXT_PUBLIC_SENTRY_DSN: DSN });
    expect(options?.environment).toBeUndefined();
    expect(options?.release).toBeUndefined();
  });

  it('should disable PII and define no tracing, profiling, replay or logs option', () => {
    const options = buildSentryInitOptions({ NEXT_PUBLIC_SENTRY_DSN: DSN });
    expect(options?.sendDefaultPii).toBe(false);
    for (const key of [
      'tracesSampleRate',
      'tracesSampler',
      'profilesSampleRate',
      'replaysSessionSampleRate',
      'replaysOnErrorSampleRate',
      'enableLogs',
    ]) {
      expect(options).not.toHaveProperty(key);
    }
  });

  it('should remove only the BrowserSession integration', () => {
    const options = buildSentryInitOptions({ NEXT_PUBLIC_SENTRY_DSN: DSN });
    const defaults = [{ name: 'BrowserSession' }, { name: 'GlobalHandlers' }, { name: 'Dedupe' }];
    expect(options?.integrations(defaults).map((integration) => integration.name)).toEqual([
      'GlobalHandlers',
      'Dedupe',
    ]);
  });

  it('should ignore the ResizeObserver messages and deny extension scripts', () => {
    const options = buildSentryInitOptions({ NEXT_PUBLIC_SENTRY_DSN: DSN });
    expect(options?.ignoreErrors).toEqual(
      expect.arrayContaining([
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications.',
      ]),
    );
    for (const url of [
      'chrome-extension://abc/script.js',
      'moz-extension://abc/script.js',
      'safari-extension://abc/script.js',
    ]) {
      expect(options?.denyUrls.some((pattern) => pattern.test(url))).toBe(true);
    }
    expect(
      options?.denyUrls.some((pattern) => pattern.test('https://eco-metrics.earth/a.js')),
    ).toBe(false);
  });
});

describe('getSentryInitOptions', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT;
    delete process.env.NEXT_PUBLIC_SENTRY_RELEASE;
  });

  it('should be disabled when no DSN is in the environment', () => {
    expect(getSentryInitOptions()).toBeUndefined();
  });

  it('should read the three NEXT_PUBLIC variables', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = DSN;
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT = 'production';
    process.env.NEXT_PUBLIC_SENTRY_RELEASE = 'sha1';
    expect(getSentryInitOptions()).toMatchObject({
      dsn: DSN,
      environment: 'production',
      release: 'sha1',
    });
  });
});

describe('sentryIngestOrigin', () => {
  it('should return the https origin of the DSN host', () => {
    expect(sentryIngestOrigin(DSN)).toBe('https://o1.ingest.de.sentry.io');
  });

  it.each([undefined, '', 'not a url', 'http://abc@o1.ingest.de.sentry.io/42'])(
    'should return undefined for %p',
    (dsn) => {
      expect(sentryIngestOrigin(dsn)).toBeUndefined();
    },
  );
});

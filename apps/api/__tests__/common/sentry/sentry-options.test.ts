import { buildSentryOptions } from '../../../src/common/sentry/sentry-options';

describe('buildSentryOptions', () => {
  it('should return undefined when the DSN is unset', () => {
    expect(buildSentryOptions({})).toBeUndefined();
  });

  it('should return undefined when the DSN is empty', () => {
    expect(
      buildSentryOptions({ SENTRY_DSN: '', SENTRY_ENVIRONMENT: 'production' }),
    ).toBeUndefined();
  });

  it('should return the dsn, environment and release when all are set', () => {
    expect(
      buildSentryOptions({
        SENTRY_DSN: 'https://key@o1.ingest.de.sentry.io/42',
        SENTRY_ENVIRONMENT: 'production',
        SENTRY_RELEASE: 'abc123',
      }),
    ).toMatchObject({
      dsn: 'https://key@o1.ingest.de.sentry.io/42',
      environment: 'production',
      release: 'abc123',
    });
  });

  it('should omit environment and release when they are empty', () => {
    const options = buildSentryOptions({
      SENTRY_DSN: 'https://key@o1.ingest.de.sentry.io/42',
      SENTRY_ENVIRONMENT: '',
      SENTRY_RELEASE: '',
    });
    expect(options).toEqual({
      dsn: 'https://key@o1.ingest.de.sentry.io/42',
      sendDefaultPii: false,
    });
  });

  it('should disable PII and define no tracing, profiling or logs option', () => {
    const options = buildSentryOptions({ SENTRY_DSN: 'https://key@o1.ingest.de.sentry.io/42' });
    expect(options?.sendDefaultPii).toBe(false);
    for (const key of ['tracesSampleRate', 'tracesSampler', 'profilesSampleRate', 'enableLogs']) {
      expect(options).not.toHaveProperty(key);
    }
  });
});

import * as Sentry from '@sentry/nextjs';

jest.mock('@sentry/nextjs', () => ({ init: jest.fn(), captureRequestError: jest.fn() }));

const init = Sentry.init as jest.Mock;
const DSN = 'https://abc123@o1.ingest.de.sentry.io/42';
const ORIGINAL_RUNTIME = process.env.NEXT_RUNTIME;

describe('instrumentation', () => {
  beforeEach(() => {
    init.mockClear();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (ORIGINAL_RUNTIME === undefined) {
      delete process.env.NEXT_RUNTIME;
    } else {
      process.env.NEXT_RUNTIME = ORIGINAL_RUNTIME;
    }
  });

  it('should export onRequestError as the Sentry captureRequestError', async () => {
    const instrumentation = await import('@/instrumentation');
    expect(instrumentation.onRequestError).toBe(Sentry.captureRequestError);
  });

  it('should initialize Sentry on the nodejs runtime when a DSN is set', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    process.env.NEXT_PUBLIC_SENTRY_DSN = DSN;
    const { register } = await import('@/instrumentation');

    register();

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ dsn: DSN, sendDefaultPii: false }));
  });

  it('should not initialize Sentry without a DSN', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    const { register } = await import('@/instrumentation');

    register();

    expect(init).not.toHaveBeenCalled();
  });

  it('should not initialize Sentry on the edge runtime', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    process.env.NEXT_PUBLIC_SENTRY_DSN = DSN;
    const { register } = await import('@/instrumentation');

    register();

    expect(init).not.toHaveBeenCalled();
  });
});

describe('instrumentation-client', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  it('should initialize Sentry when a DSN is set', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = DSN;
    await import('@/instrumentation-client');
    const freshInit = (await import('@sentry/nextjs')).init as jest.Mock;
    expect(freshInit).toHaveBeenCalledTimes(1);
  });

  it('should not initialize Sentry without a DSN', async () => {
    await import('@/instrumentation-client');
    const freshInit = (await import('@sentry/nextjs')).init as jest.Mock;
    expect(freshInit).not.toHaveBeenCalled();
  });
});

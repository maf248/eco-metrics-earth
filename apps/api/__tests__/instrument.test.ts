import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('@sentry/nestjs', () => ({ init: jest.fn() }));

const ORIGINAL_ENV = { ...process.env };

async function importInstrument(env: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV, ...env };
  let init: jest.Mock | undefined;
  await jest.isolateModulesAsync(async () => {
    init = ((await import('@sentry/nestjs')) as unknown as { init: jest.Mock }).init;
    await import('../src/instrument');
  });
  return { init };
}

describe('instrument', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('should be the first import of main.ts', () => {
    const source = readFileSync(join(__dirname, '../src/main.ts'), 'utf8');
    const firstImport = /^import\s.*$/m.exec(source);
    expect(firstImport?.[0]).toBe("import './instrument';");
  });

  it('should not initialize Sentry without a DSN', async () => {
    const { init } = await importInstrument({ SENTRY_DSN: undefined });
    expect(init).not.toHaveBeenCalled();
  });

  it('should initialize Sentry with the builder options when a DSN is set', async () => {
    const { init } = await importInstrument({
      SENTRY_DSN: 'https://key@o1.ingest.de.sentry.io/42',
      SENTRY_ENVIRONMENT: 'production',
      SENTRY_RELEASE: 'abc123',
    });
    expect(init).toHaveBeenCalledWith({
      dsn: 'https://key@o1.ingest.de.sentry.io/42',
      environment: 'production',
      release: 'abc123',
      sendDefaultPii: false,
    });
  });
});

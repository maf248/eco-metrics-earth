import { NestFactory } from '@nestjs/core';

jest.mock('../../src/app/global-pipeline', () => {
  const actual = jest.requireActual<typeof import('../../src/app/global-pipeline')>(
    '../../src/app/global-pipeline',
  );
  return { applyGlobalPipeline: jest.fn(actual.applyGlobalPipeline) };
});

jest.mock('@nestjs/core', () => ({
  ...jest.requireActual<typeof import('@nestjs/core')>('@nestjs/core'),
  NestFactory: { create: jest.fn() },
}));

interface FakeAppConfig {
  corsOrigins: string[];
  swaggerEnabled: boolean;
  port: number;
  trustProxyHops: number;
}

function createFakeApp(appConfig: FakeAppConfig) {
  const calls: string[] = [];
  const track = (name: string) =>
    jest.fn((..._args: unknown[]) => {
      calls.push(name);
    });

  const app = {
    useLogger: track('useLogger'),
    useGlobalPipes: track('useGlobalPipes'),
    useGlobalFilters: track('useGlobalFilters'),
    use: track('use'),
    setGlobalPrefix: track('setGlobalPrefix'),
    get: jest.fn(() => appConfig),
    enableCors: track('enableCors'),
    set: track('set'),
    enableShutdownHooks: track('enableShutdownHooks'),
    listen: jest.fn(async (..._args: unknown[]) => {
      calls.push('listen');
    }),
  };

  return { app, calls };
}

async function runMain(appConfig: FakeAppConfig) {
  const { app, calls } = createFakeApp(appConfig);
  (NestFactory.create as jest.Mock).mockResolvedValue(app);

  let applyGlobalPipeline: jest.Mock | undefined;
  await jest.isolateModulesAsync(async () => {
    await import('../../src/main');
    // Same isolated registry as main.ts, so this is the spy main.ts actually called.
    applyGlobalPipeline = (
      (await import('../../src/app/global-pipeline')) as unknown as {
        applyGlobalPipeline: jest.Mock;
      }
    ).applyGlobalPipeline;
  });
  await new Promise<void>((resolve) => setImmediate(resolve));

  return { app, calls, applyGlobalPipeline };
}

describe('main bootstrap', () => {
  it('should set trust proxy to the configured hop count as a number', async () => {
    const { app } = await runMain({
      corsOrigins: [],
      swaggerEnabled: false,
      port: 3001,
      trustProxyHops: 1,
    });

    expect(app.set).toHaveBeenCalledTimes(1);
    expect(app.set).toHaveBeenCalledWith('trust proxy', 1);
    expect(app.set).not.toHaveBeenCalledWith('trust proxy', true);
  });

  it('should set trust proxy to 0 when no hops are configured', async () => {
    const { app } = await runMain({
      corsOrigins: [],
      swaggerEnabled: false,
      port: 3001,
      trustProxyHops: 0,
    });

    expect(app.set).toHaveBeenCalledWith('trust proxy', 0);
  });

  it('should enable shutdown hooks exactly once, before listen', async () => {
    const { app, calls } = await runMain({
      corsOrigins: [],
      swaggerEnabled: false,
      port: 3001,
      trustProxyHops: 1,
    });

    expect(app.enableShutdownHooks).toHaveBeenCalledTimes(1);
    expect(app.listen).toHaveBeenCalledWith(3001);
    expect(calls.indexOf('enableShutdownHooks')).toBeLessThan(calls.indexOf('listen'));
  });

  it('should register the pipe and filter only through applyGlobalPipeline, before listen', async () => {
    const { app, calls, applyGlobalPipeline } = await runMain({
      corsOrigins: [],
      swaggerEnabled: false,
      port: 3001,
      trustProxyHops: 1,
    });

    expect(applyGlobalPipeline).toHaveBeenCalledTimes(1);
    expect(applyGlobalPipeline).toHaveBeenCalledWith(app);
    // A single call each means main.ts registers nothing inline besides the shared function.
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.useGlobalFilters).toHaveBeenCalledTimes(1);
    expect(calls.indexOf('useGlobalPipes')).toBeLessThan(calls.indexOf('listen'));
    expect(calls.indexOf('useGlobalFilters')).toBeLessThan(calls.indexOf('listen'));
  });

  it('should configure trust proxy before listening', async () => {
    const { calls } = await runMain({
      corsOrigins: [],
      swaggerEnabled: false,
      port: 3001,
      trustProxyHops: 1,
    });

    expect(calls.indexOf('set')).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf('set')).toBeLessThan(calls.indexOf('listen'));
  });

  it('should create the app with buffered logs and abortOnError disabled', async () => {
    await runMain({ corsOrigins: [], swaggerEnabled: false, port: 3001, trustProxyHops: 1 });

    expect(NestFactory.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ bufferLogs: true, abortOnError: false }),
    );
  });

  it('should install the pino logger exactly once, before listen', async () => {
    const { app, calls } = await runMain({
      corsOrigins: [],
      swaggerEnabled: false,
      port: 3001,
      trustProxyHops: 1,
    });

    expect(app.useLogger).toHaveBeenCalledTimes(1);
    expect(calls.indexOf('useLogger')).toBeLessThan(calls.indexOf('listen'));
  });

  describe('bootstrap failure', () => {
    let stderrWrite: jest.SpyInstance;
    let exit: jest.SpyInstance;

    beforeEach(() => {
      stderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
      exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    });

    afterEach(() => {
      stderrWrite.mockRestore();
      exit.mockRestore();
    });

    it('should write one JSON line with severity ERROR and the stack, then exit with 1', async () => {
      const failure = new Error('Config validation error: "LOG_LEVEL" must be one of ...');
      (NestFactory.create as jest.Mock).mockRejectedValue(failure);

      await jest.isolateModulesAsync(async () => {
        await import('../../src/main');
      });
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(stderrWrite).toHaveBeenCalledTimes(1);
      const written = String(stderrWrite.mock.calls[0][0]);
      expect(written.endsWith('\n')).toBe(true);
      expect(written.trimEnd().split('\n')).toHaveLength(1);
      const entry = JSON.parse(written) as { severity: string; message: string };
      expect(entry.severity).toBe('ERROR');
      expect(entry.message).toBe(failure.stack);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it('should log a non-Error rejection as a string message', async () => {
      (NestFactory.create as jest.Mock).mockRejectedValue('plain failure');

      await jest.isolateModulesAsync(async () => {
        await import('../../src/main');
      });
      await new Promise<void>((resolve) => setImmediate(resolve));

      const entry = JSON.parse(String(stderrWrite.mock.calls[0][0])) as { message: string };
      expect(entry.message).toBe('plain failure');
      expect(exit).toHaveBeenCalledWith(1);
    });
  });
});

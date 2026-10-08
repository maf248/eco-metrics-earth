import { NestFactory } from '@nestjs/core';

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

  await jest.isolateModulesAsync(async () => {
    await import('../../src/main');
  });
  await new Promise<void>((resolve) => setImmediate(resolve));

  return { app, calls };
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
});

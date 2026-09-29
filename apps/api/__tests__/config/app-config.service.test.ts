import { ConfigService } from '@nestjs/config';

import { AppConfigService } from '../../src/config/app-config.service';

describe('AppConfigService', () => {
  function buildService(env: Record<string, unknown>): AppConfigService {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const value = env[key];
        if (value === undefined) {
          throw new Error(`Configuration key "${key}" does not exist`);
        }
        return value;
      }),
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;
    return new AppConfigService(configService);
  }

  describe('port', () => {
    it('should return the numeric value from ConfigService when PORT is set', () => {
      const service = buildService({ PORT: 4000 });
      expect(service.port).toBe(4000);
    });

    it('should throw when PORT is not in config', () => {
      const service = buildService({});
      expect(() => service.port).toThrow('PORT');
    });
  });

  describe('nodeEnv', () => {
    it('should return the configured string when NODE_ENV is set', () => {
      const service = buildService({ NODE_ENV: 'production' });
      expect(service.nodeEnv).toBe('production');
    });

    it('should throw when NODE_ENV is not in config', () => {
      const service = buildService({});
      expect(() => service.nodeEnv).toThrow('NODE_ENV');
    });
  });

  describe('corsOrigins', () => {
    it('should return a single origin as a one-entry array when CORS_ORIGIN is set', () => {
      const service = buildService({
        CORS_ORIGIN: 'https://eco-metrics.earth',
      });
      expect(service.corsOrigins).toEqual(['https://eco-metrics.earth']);
    });

    it('should return multiple trimmed origins when CORS_ORIGIN is a comma-separated list', () => {
      const service = buildService({
        CORS_ORIGIN: 'http://localhost:3000, https://eco-metrics.earth',
      });
      expect(service.corsOrigins).toEqual(['http://localhost:3000', 'https://eco-metrics.earth']);
    });

    it('should append the compiled RegExp as the last element when CORS_ORIGIN_PATTERN is set', () => {
      const service = buildService({
        CORS_ORIGIN: 'https://eco-metrics.earth',
        CORS_ORIGIN_PATTERN: '^https://eco-metrics-earth-[a-z0-9-]+\\.vercel\\.app$',
      });
      const origins = service.corsOrigins;
      expect(origins).toHaveLength(2);
      expect(origins[0]).toBe('https://eco-metrics.earth');
      expect(origins[1]).toBeInstanceOf(RegExp);
      expect(
        (origins[1] as RegExp).test('https://eco-metrics-earth-abc123-some-scope.vercel.app'),
      ).toBe(true);
    });

    it('should return only string origins when CORS_ORIGIN_PATTERN is absent', () => {
      const service = buildService({
        CORS_ORIGIN: 'http://localhost:3000',
      });
      expect(service.corsOrigins).toEqual(['http://localhost:3000']);
    });

    it('should return only string origins when CORS_ORIGIN_PATTERN is empty', () => {
      const service = buildService({
        CORS_ORIGIN: 'http://localhost:3000',
        CORS_ORIGIN_PATTERN: '',
      });
      expect(service.corsOrigins).toEqual(['http://localhost:3000']);
    });

    it('should throw when CORS_ORIGIN is not in config', () => {
      const service = buildService({});
      expect(() => service.corsOrigins).toThrow('CORS_ORIGIN');
    });
  });
});

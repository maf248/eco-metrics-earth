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

  describe('owidGrapherBaseUrl', () => {
    it('should return the configured OWID_GRAPHER_BASE_URL', () => {
      const service = buildService({ OWID_GRAPHER_BASE_URL: 'https://owid.example.com/grapher' });
      expect(service.owidGrapherBaseUrl).toBe('https://owid.example.com/grapher');
    });

    it('should throw when OWID_GRAPHER_BASE_URL is not in config', () => {
      const service = buildService({});
      expect(() => service.owidGrapherBaseUrl).toThrow('OWID_GRAPHER_BASE_URL');
    });
  });

  describe('owidApiBaseUrl', () => {
    it('should return the configured OWID_API_BASE_URL', () => {
      const service = buildService({ OWID_API_BASE_URL: 'https://api.owid.example.com/v1' });
      expect(service.owidApiBaseUrl).toBe('https://api.owid.example.com/v1');
    });

    it('should throw when OWID_API_BASE_URL is not in config', () => {
      const service = buildService({});
      expect(() => service.owidApiBaseUrl).toThrow('OWID_API_BASE_URL');
    });
  });

  describe('owidHttpTimeoutMs', () => {
    it('should return the configured OWID_HTTP_TIMEOUT_MS', () => {
      const service = buildService({ OWID_HTTP_TIMEOUT_MS: 30000 });
      expect(service.owidHttpTimeoutMs).toBe(30000);
    });

    it('should throw when OWID_HTTP_TIMEOUT_MS is not in config', () => {
      const service = buildService({});
      expect(() => service.owidHttpTimeoutMs).toThrow('OWID_HTTP_TIMEOUT_MS');
    });
  });

  describe('owidCacheTtlSeconds', () => {
    it('should return the configured OWID_CACHE_TTL_SECONDS', () => {
      const service = buildService({ OWID_CACHE_TTL_SECONDS: 3600 });
      expect(service.owidCacheTtlSeconds).toBe(3600);
    });

    it('should throw when OWID_CACHE_TTL_SECONDS is not in config', () => {
      const service = buildService({});
      expect(() => service.owidCacheTtlSeconds).toThrow('OWID_CACHE_TTL_SECONDS');
    });
  });
});

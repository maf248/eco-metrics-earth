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

  describe('corsOrigin', () => {
    it('should return the configured URI when CORS_ORIGIN is set', () => {
      const service = buildService({
        CORS_ORIGIN: 'https://eco-metrics.earth',
      });
      expect(service.corsOrigin).toBe('https://eco-metrics.earth');
    });

    it('should throw when CORS_ORIGIN is not in config', () => {
      const service = buildService({});
      expect(() => service.corsOrigin).toThrow('CORS_ORIGIN');
    });
  });
});

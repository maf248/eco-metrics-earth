import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '../../src/config/app-config.service';

describe('AppConfigService', () => {
  function buildService(env: Record<string, unknown>): AppConfigService {
    const configService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;
    return new AppConfigService(configService);
  }

  describe('port', () => {
    it('should return the numeric value from ConfigService when PORT is set', () => {
      const service = buildService({ PORT: 4000 });
      expect(service.port).toBe(4000);
    });

    it('should return 3001 when ConfigService returns undefined for PORT', () => {
      const service = buildService({});
      expect(service.port).toBe(3001);
    });
  });

  describe('nodeEnv', () => {
    it('should return the configured string when NODE_ENV is set', () => {
      const service = buildService({ NODE_ENV: 'production' });
      expect(service.nodeEnv).toBe('production');
    });

    it('should return "development" when ConfigService returns undefined for NODE_ENV', () => {
      const service = buildService({});
      expect(service.nodeEnv).toBe('development');
    });
  });
});

import { apiBaseUrl } from '@/lib/apiBaseUrl';

describe('apiBaseUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return the env var value when set', () => {
    process.env.API_BASE_URL = 'https://eco-metrics-earth-api.railway.app/api/v1';
    expect(apiBaseUrl()).toBe('https://eco-metrics-earth-api.railway.app/api/v1');
  });

  it('should strip a trailing slash from the env var value', () => {
    process.env.API_BASE_URL = 'http://localhost:3001/api/v1/';
    expect(apiBaseUrl()).toBe('http://localhost:3001/api/v1');
  });

  it('should fall back to http://localhost:3001/api/v1 when env var is absent', () => {
    delete process.env.API_BASE_URL;
    expect(apiBaseUrl()).toBe('http://localhost:3001/api/v1');
  });

  it('should fall back to http://localhost:3001/api/v1 when env var is empty string', () => {
    process.env.API_BASE_URL = '';
    expect(apiBaseUrl()).toBe('http://localhost:3001/api/v1');
  });
});

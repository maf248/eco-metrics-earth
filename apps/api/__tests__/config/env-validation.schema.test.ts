import { envValidationSchema } from '../../src/config/env-validation.schema';

describe('envValidationSchema', () => {
  function validate(env: Record<string, unknown>) {
    return envValidationSchema.validate(env, {
      allowUnknown: true,
      abortEarly: true,
    });
  }

  describe('CORS_ORIGIN', () => {
    it('should accept a single valid origin', () => {
      const { error, value } = validate({ CORS_ORIGIN: 'https://eco-metrics.earth' });
      expect(error).toBeUndefined();
      expect(value.CORS_ORIGIN).toBe('https://eco-metrics.earth');
    });

    it('should accept a comma-separated list of valid origins', () => {
      const { error, value } = validate({
        CORS_ORIGIN: 'http://localhost:3000,https://eco-metrics.earth',
      });
      expect(error).toBeUndefined();
      expect(value.CORS_ORIGIN).toBe('http://localhost:3000,https://eco-metrics.earth');
    });

    it('should tolerate whitespace around commas', () => {
      const { error, value } = validate({
        CORS_ORIGIN: 'http://localhost:3000 , https://eco-metrics.earth',
      });
      expect(error).toBeUndefined();
      expect(value.CORS_ORIGIN).toBe('http://localhost:3000 , https://eco-metrics.earth');
    });

    it('should reject a list containing a non-URI entry', () => {
      const { error } = validate({ CORS_ORIGIN: 'http://localhost:3000,not-a-url' });
      expect(error).toBeDefined();
      expect(error?.message).toContain('CORS_ORIGIN');
    });

    it('should reject a wildcard entry and point the operator to CORS_ORIGIN_PATTERN', () => {
      const { error } = validate({ CORS_ORIGIN: 'https://*.vercel.app' });
      expect(error).toBeDefined();
      expect(error?.message).toContain('CORS_ORIGIN_PATTERN');
    });

    it('should reject a trailing comma', () => {
      const { error } = validate({ CORS_ORIGIN: 'http://localhost:3000,' });
      expect(error).toBeDefined();
      expect(error?.message).toContain('CORS_ORIGIN');
    });

    it('should reject doubled commas', () => {
      const { error } = validate({
        CORS_ORIGIN: 'http://localhost:3000,,https://eco-metrics.earth',
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain('CORS_ORIGIN');
    });

    it('should reject an empty string', () => {
      const { error } = validate({ CORS_ORIGIN: '' });
      expect(error).toBeDefined();
      expect(error?.message).toContain('CORS_ORIGIN');
    });

    it('should default to http://localhost:3000 when absent', () => {
      const { error, value } = validate({});
      expect(error).toBeUndefined();
      expect(value.CORS_ORIGIN).toBe('http://localhost:3000');
    });
  });

  describe('CORS_ORIGIN_PATTERN', () => {
    it('should accept an anchored, compiling pattern', () => {
      const { error, value } = validate({
        CORS_ORIGIN_PATTERN: '^https://eco-metrics-earth-[a-z0-9-]+\\.vercel\\.app$',
      });
      expect(error).toBeUndefined();
      expect(value.CORS_ORIGIN_PATTERN).toBe(
        '^https://eco-metrics-earth-[a-z0-9-]+\\.vercel\\.app$',
      );
    });

    it('should reject an unanchored pattern missing the start anchor', () => {
      const { error } = validate({
        CORS_ORIGIN_PATTERN: 'https://eco-metrics-earth-[a-z0-9-]+\\.vercel\\.app$',
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain('must start with "^"');
    });

    it('should reject an unanchored pattern missing the end anchor', () => {
      const { error } = validate({
        CORS_ORIGIN_PATTERN: '^https://eco-metrics-earth-[a-z0-9-]+\\.vercel\\.app',
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain('must end with "$"');
    });

    it('should reject a non-compiling pattern', () => {
      const { error } = validate({
        CORS_ORIGIN_PATTERN: '^https://([unbalanced\\.vercel\\.app$',
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain('valid regular expression');
    });

    it('should accept an empty pattern', () => {
      const { error, value } = validate({ CORS_ORIGIN_PATTERN: '' });
      expect(error).toBeUndefined();
      expect(value.CORS_ORIGIN_PATTERN).toBe('');
    });

    it('should accept an absent pattern', () => {
      const { error, value } = validate({});
      expect(error).toBeUndefined();
      expect(value.CORS_ORIGIN_PATTERN).toBeUndefined();
    });
  });

  describe('OWID_GRAPHER_BASE_URL', () => {
    it('should default to https://ourworldindata.org/grapher when absent', () => {
      const { error, value } = validate({});
      expect(error).toBeUndefined();
      expect(value.OWID_GRAPHER_BASE_URL).toBe('https://ourworldindata.org/grapher');
    });

    it('should accept a valid custom base URL without trailing slash', () => {
      const { error, value } = validate({
        OWID_GRAPHER_BASE_URL: 'https://owid.example.com/grapher',
      });
      expect(error).toBeUndefined();
      expect(value.OWID_GRAPHER_BASE_URL).toBe('https://owid.example.com/grapher');
    });

    it('should reject a non-URI value', () => {
      const { error } = validate({ OWID_GRAPHER_BASE_URL: 'not-a-url' });
      expect(error).toBeDefined();
      expect(error?.message).toContain('OWID_GRAPHER_BASE_URL');
    });

    it('should reject a trailing slash and explain the broken URL consequence', () => {
      const { error } = validate({ OWID_GRAPHER_BASE_URL: 'https://ourworldindata.org/grapher/' });
      expect(error).toBeDefined();
      expect(error?.message).toContain('trailing slash');
      expect(error?.message).toContain('//path');
    });
  });

  describe('OWID_API_BASE_URL', () => {
    it('should default to https://api.ourworldindata.org/v1 when absent', () => {
      const { error, value } = validate({});
      expect(error).toBeUndefined();
      expect(value.OWID_API_BASE_URL).toBe('https://api.ourworldindata.org/v1');
    });

    it('should reject a trailing slash', () => {
      const { error } = validate({ OWID_API_BASE_URL: 'https://api.ourworldindata.org/v1/' });
      expect(error).toBeDefined();
      expect(error?.message).toContain('OWID_API_BASE_URL');
      expect(error?.message).toContain('trailing slash');
    });
  });

  describe('OWID_HTTP_TIMEOUT_MS', () => {
    it('should default to 10000 when absent', () => {
      const { error, value } = validate({});
      expect(error).toBeUndefined();
      expect(value.OWID_HTTP_TIMEOUT_MS).toBe(10000);
    });

    it('should accept a valid custom value', () => {
      const { error, value } = validate({ OWID_HTTP_TIMEOUT_MS: 30000 });
      expect(error).toBeUndefined();
      expect(value.OWID_HTTP_TIMEOUT_MS).toBe(30000);
    });

    it('should reject a value below the lower bound', () => {
      const { error } = validate({ OWID_HTTP_TIMEOUT_MS: 999 });
      expect(error).toBeDefined();
      expect(error?.message).toContain('OWID_HTTP_TIMEOUT_MS');
    });

    it('should reject a value above the upper bound', () => {
      const { error } = validate({ OWID_HTTP_TIMEOUT_MS: 60001 });
      expect(error).toBeDefined();
      expect(error?.message).toContain('OWID_HTTP_TIMEOUT_MS');
    });
  });

  describe('OWID_CACHE_TTL_SECONDS', () => {
    it('should default to 86400 when absent', () => {
      const { error, value } = validate({});
      expect(error).toBeUndefined();
      expect(value.OWID_CACHE_TTL_SECONDS).toBe(86400);
    });

    it('should accept a valid custom value', () => {
      const { error, value } = validate({ OWID_CACHE_TTL_SECONDS: 3600 });
      expect(error).toBeUndefined();
      expect(value.OWID_CACHE_TTL_SECONDS).toBe(3600);
    });

    it('should reject a value below the lower bound', () => {
      const { error } = validate({ OWID_CACHE_TTL_SECONDS: 59 });
      expect(error).toBeDefined();
      expect(error?.message).toContain('OWID_CACHE_TTL_SECONDS');
    });

    it('should reject a value above the upper bound', () => {
      const { error } = validate({ OWID_CACHE_TTL_SECONDS: 604801 });
      expect(error).toBeDefined();
      expect(error?.message).toContain('OWID_CACHE_TTL_SECONDS');
    });
  });

  describe('TRUST_PROXY_HOPS', () => {
    it('should default to 0 when absent', () => {
      const { error, value } = validate({});
      expect(error).toBeUndefined();
      expect(value.TRUST_PROXY_HOPS).toBe(0);
    });

    it('should accept the string "1" and convert it to the number 1', () => {
      const { error, value } = validate({ TRUST_PROXY_HOPS: '1' });
      expect(error).toBeUndefined();
      expect(value.TRUST_PROXY_HOPS).toBe(1);
    });

    it.each(['-1', '1.5', 'abc', 'true'])('should reject %s', (input) => {
      const { error } = validate({ TRUST_PROXY_HOPS: input });
      expect(error).toBeDefined();
      expect(error?.message).toContain('TRUST_PROXY_HOPS');
    });
  });

  describe('INTERNAL_API_KEY', () => {
    it('should accept an unset key', () => {
      const { error, value } = validate({});
      expect(error).toBeUndefined();
      expect(value.INTERNAL_API_KEY).toBeUndefined();
    });

    it('should accept an empty key', () => {
      const { error } = validate({ INTERNAL_API_KEY: '' });
      expect(error).toBeUndefined();
    });

    it('should reject a 31-character key without echoing the value', () => {
      const shortKey = 'k'.repeat(31);
      const { error } = validate({ INTERNAL_API_KEY: shortKey });
      expect(error).toBeDefined();
      expect(error?.message).toContain('INTERNAL_API_KEY');
      expect(error?.message).not.toContain(shortKey);
    });

    it('should accept a 32-character key', () => {
      const { error, value } = validate({ INTERNAL_API_KEY: 'k'.repeat(32) });
      expect(error).toBeUndefined();
      expect(value.INTERNAL_API_KEY).toBe('k'.repeat(32));
    });
  });
});

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
});

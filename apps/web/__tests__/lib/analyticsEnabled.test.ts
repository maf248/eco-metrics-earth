import { analyticsEnabled } from '@/lib/analyticsEnabled';

describe('analyticsEnabled', () => {
  it('should return true for a Vercel production deployment', () => {
    expect(analyticsEnabled({ VERCEL_ENV: 'production' })).toBe(true);
  });

  it.each(['preview', 'development', '', 'staging', 'Production'])(
    'should return false when VERCEL_ENV is %p',
    (value) => {
      expect(analyticsEnabled({ VERCEL_ENV: value })).toBe(false);
    },
  );

  it('should return false when VERCEL_ENV is undefined', () => {
    expect(analyticsEnabled({})).toBe(false);
    expect(analyticsEnabled({ VERCEL_ENV: undefined })).toBe(false);
  });

  it('should ignore every variable other than VERCEL_ENV', () => {
    expect(analyticsEnabled({ VERCEL: '1', NODE_ENV: 'production', VERCEL_URL: 'x' })).toBe(false);
    expect(analyticsEnabled({ VERCEL: '1', VERCEL_ENV: 'production' })).toBe(true);
  });

  describe('default argument', () => {
    const original = process.env.VERCEL_ENV;

    afterEach(() => {
      if (original === undefined) {
        delete process.env.VERCEL_ENV;
      } else {
        process.env.VERCEL_ENV = original;
      }
    });

    it('should read process.env when called without arguments', () => {
      process.env.VERCEL_ENV = 'production';
      expect(analyticsEnabled()).toBe(true);

      process.env.VERCEL_ENV = 'preview';
      expect(analyticsEnabled()).toBe(false);

      delete process.env.VERCEL_ENV;
      expect(analyticsEnabled()).toBe(false);
    });
  });
});

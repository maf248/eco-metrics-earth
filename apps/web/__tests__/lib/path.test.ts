import { normalise } from '@/lib/path';

describe('normalise', () => {
  it('should strip a single trailing slash', () => {
    expect(normalise('/air-quality/')).toBe('/air-quality');
  });

  it('should preserve root /', () => {
    expect(normalise('/')).toBe('/');
  });

  it('should handle a path without a trailing slash', () => {
    expect(normalise('/air-quality')).toBe('/air-quality');
  });

  it('should handle multiple trailing slashes by stripping only the last one', () => {
    // The regex /\/$/ only matches one trailing slash, so only the last is removed.
    expect(normalise('/air-quality//')).toBe('/air-quality/');
  });
});

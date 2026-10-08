import { internalApiHeaders } from '@/lib/internalApiHeaders';

describe('internalApiHeaders', () => {
  const originalKey = process.env.INTERNAL_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = originalKey;
    }
  });

  it('should return the X-Internal-Api-Key header when the key is set', () => {
    process.env.INTERNAL_API_KEY = 'k'.repeat(32);

    expect(internalApiHeaders()).toEqual({ 'X-Internal-Api-Key': 'k'.repeat(32) });
  });

  it('should trim surrounding whitespace from the key', () => {
    process.env.INTERNAL_API_KEY = `  ${'k'.repeat(32)}\n`;

    expect(internalApiHeaders()).toEqual({ 'X-Internal-Api-Key': 'k'.repeat(32) });
  });

  it('should return an empty object when the key is unset', () => {
    delete process.env.INTERNAL_API_KEY;

    expect(internalApiHeaders()).toEqual({});
  });

  it('should return an empty object when the key is whitespace only', () => {
    process.env.INTERNAL_API_KEY = '   ';

    expect(internalApiHeaders()).toEqual({});
  });
});

import manifest from '@/app/manifest';

describe('manifest', () => {
  it('should have name "eco-metrics earth"', () => {
    const result = manifest();
    expect(result.name).toBe('eco-metrics earth');
  });

  it('should have short_name "eco-metrics"', () => {
    const result = manifest();
    expect(result.short_name).toBe('eco-metrics');
  });

  it('should have theme_color "#10b981"', () => {
    const result = manifest();
    expect(result.theme_color).toBe('#10b981');
  });

  it('should have background_color "#000000"', () => {
    const result = manifest();
    expect(result.background_color).toBe('#000000');
  });

  it('should have at least one icon entry', () => {
    const result = manifest();
    expect(result.icons).toBeDefined();
    expect(result.icons!.length).toBeGreaterThanOrEqual(1);
  });

  it('should declare the site logo SVG with purpose "any"', () => {
    const result = manifest();
    expect(result.icons).toContainEqual({
      src: '/icons/eco-metrics-earth.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    });
  });

  it.each([
    ['/icons/icon-192.png', '192x192', 'any'],
    ['/icons/icon-512.png', '512x512', 'any'],
    ['/icons/icon-maskable-192.png', '192x192', 'maskable'],
    ['/icons/icon-maskable-512.png', '512x512', 'maskable'],
  ] as const)('should declare %s (%s) with purpose "%s"', (src, sizes, purpose) => {
    const result = manifest();
    expect(result.icons).toContainEqual({ src, sizes, type: 'image/png', purpose });
  });

  it('should declare exactly one purpose per icon entry', () => {
    const result = manifest();
    for (const icon of result.icons!) {
      expect(['any', 'maskable']).toContain(icon.purpose);
    }
  });
});

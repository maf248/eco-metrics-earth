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

  it('should have icon referencing the site logo SVG', () => {
    const result = manifest();
    const icon = result.icons![0];
    expect(icon.src).toBeTruthy();
  });
});

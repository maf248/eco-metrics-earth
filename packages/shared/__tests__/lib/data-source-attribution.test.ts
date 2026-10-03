import type { DataSourceAttribution } from '../../src/lib/data-source-attribution';

describe('DataSourceAttribution', () => {
  it('should carry the four required fields', () => {
    const attribution: DataSourceAttribution = {
      provider: 'Our World in Data',
      license: 'CC BY 4.0',
      sourceUrl: 'https://ourworldindata.org/grapher/co-emissions-per-capita',
      lastUpdated: '2024-01-15T00:00:00.000Z',
    };

    expect(attribution.provider).toBe('Our World in Data');
    expect(attribution.license).toBe('CC BY 4.0');
    expect(attribution.sourceUrl).toContain('ourworldindata.org');
    expect(attribution.lastUpdated).toBe('2024-01-15T00:00:00.000Z');
  });

  it('should accept an ISO 8601 timestamp with timezone offset', () => {
    const attribution: DataSourceAttribution = {
      provider: 'NOAA',
      license: 'Public domain',
      sourceUrl: 'https://example.com/noaa',
      lastUpdated: '2024-06-01T12:30:00+00:00',
    };
    expect(attribution.lastUpdated).toBe('2024-06-01T12:30:00+00:00');
  });
});

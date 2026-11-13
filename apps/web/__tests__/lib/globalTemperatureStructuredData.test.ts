import { buildGlobalTemperatureDatasetJsonLd } from '@/lib/globalTemperatureStructuredData';

import { TEMPERATURE_FIXTURE, TEMPERATURE_META } from '../fixtures/globalTemperature';

const PAGE_URL = 'https://eco-metrics.earth/global-temperature/';
const DATA_SOURCES_URL = 'https://eco-metrics.earth/data-sources/';

function build(data = TEMPERATURE_FIXTURE) {
  return buildGlobalTemperatureDatasetJsonLd({
    data,
    meta: TEMPERATURE_META,
    pageUrl: PAGE_URL,
    dataSourcesUrl: DATA_SOURCES_URL,
  });
}

describe('buildGlobalTemperatureDatasetJsonLd', () => {
  it('should describe a schema.org Dataset at the canonical page URL covering both series', () => {
    const jsonLd = build();

    expect(jsonLd['@type']).toBe('Dataset');
    expect(jsonLd.url).toBe(PAGE_URL);
    expect(jsonLd.name).toBe(
      'Global temperature anomalies by country and since pre-industrial times, 1850–2024',
    );
  });

  it('should state both baselines and the land versus World coverage in the description', () => {
    const description = build().description as string;

    expect(description.length).toBeGreaterThanOrEqual(50);
    expect(description.length).toBeLessThanOrEqual(5000);
    expect(description).toContain('1991–2020 average');
    expect(description).toContain('1861–1890 (pre-industrial) average');
    expect(description).toContain('land inside the borders only');
    expect(description).toContain('the World value covers land and ocean');
  });

  it('should use the union of both series as temporal coverage', () => {
    expect(build().temporalCoverage).toBe('1850/2024');
    const longer = {
      ...TEMPERATURE_FIXTURE,
      global: { ...TEMPERATURE_FIXTURE.global, endYear: 2030, mean: [], lower: [], upper: [] },
    };

    expect(build(longer).temporalCoverage).toBe('1850/2030');
  });

  it('should declare one variable per baseline with the payload unit', () => {
    const jsonLd = build();

    expect(jsonLd.dateModified).toBe(TEMPERATURE_META.source.lastUpdated);
    expect(jsonLd.variableMeasured).toEqual([
      {
        '@type': 'PropertyValue',
        name: 'Annual temperature anomaly by country relative to the 1991–2020 average',
        unitText: '°C',
      },
      {
        '@type': 'PropertyValue',
        name: 'Annual global temperature anomaly relative to the 1861–1890 (pre-industrial) average',
        unitText: '°C',
      },
    ]);
  });

  it('should credit the OWID dataset and both upstream datasets', () => {
    const basedOn = build().isBasedOn as Record<string, unknown>[];
    const { provider, sourceUrl } = TEMPERATURE_META.source;

    expect(basedOn).toHaveLength(3);
    expect(basedOn).toEqual([
      {
        '@type': 'CreativeWork',
        name: 'Annual surface temperatures and anomalies by country',
        version: '2026-10-12',
        publisher: { '@type': 'Organization', name: provider, url: sourceUrl },
        url: sourceUrl,
      },
      {
        '@type': 'CreativeWork',
        name: TEMPERATURE_FIXTURE.origin.title,
        publisher: { '@type': 'Organization', name: 'Copernicus Climate Change Service (C3S)' },
        url: TEMPERATURE_FIXTURE.origin.url,
      },
      {
        '@type': 'CreativeWork',
        name: 'HadCRUT5',
        publisher: { '@type': 'Organization', name: 'Met Office Hadley Centre' },
        url: 'https://www.metoffice.gov.uk/hadobs/hadcrut5/',
      },
    ]);
  });

  it('should derive the license from the API license name and declare no distribution', () => {
    const jsonLd = build();

    expect(jsonLd.license).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(jsonLd).not.toHaveProperty('distribution');
  });
});

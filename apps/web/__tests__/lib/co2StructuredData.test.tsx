import { render } from '@testing-library/react';

import { JsonLd } from '@/components/JsonLd';
import { buildCo2DatasetJsonLd } from '@/lib/co2StructuredData';

import { CO2_FIXTURE, CO2_META } from '../fixtures/co2Emissions';

const PAGE_URL = 'https://eco-metrics.earth/co2-emissions/';
const DATA_SOURCES_URL = 'https://eco-metrics.earth/data-sources/';

function build(meta = CO2_META) {
  return buildCo2DatasetJsonLd({
    data: CO2_FIXTURE,
    meta,
    pageUrl: PAGE_URL,
    dataSourcesUrl: DATA_SOURCES_URL,
  });
}

describe('buildCo2DatasetJsonLd', () => {
  it('should describe a schema.org Dataset at the canonical page URL', () => {
    const jsonLd = build();

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Dataset');
    expect(jsonLd.url).toBe(PAGE_URL);
    expect(jsonLd.name).toBe('CO2 emissions by country, 2020–2024');
  });

  it('should describe the map and ranking views of the same data, in one block', () => {
    const { description, keywords } = build();

    expect(description).toContain('world map and a ranking of countries');
    expect(keywords).toEqual(expect.arrayContaining(['world map', 'country ranking']));
  });

  it('should keep the description within the 50-5000 characters Google requires', () => {
    const { description } = build();

    expect(typeof description).toBe('string');
    expect((description as string).length).toBeGreaterThanOrEqual(50);
    expect((description as string).length).toBeLessThanOrEqual(5000);
    expect(description).toContain('Global Carbon Budget, version 2025-11-13');
  });

  it('should derive coverage, units and dates from the payload', () => {
    const jsonLd = build();

    expect(jsonLd.temporalCoverage).toBe('2020/2024');
    expect(jsonLd.dateModified).toBe(CO2_META.source.lastUpdated);
    expect(jsonLd.variableMeasured).toEqual([
      { '@type': 'PropertyValue', name: 'Annual CO2 emissions', unitText: 'Mt CO2' },
      {
        '@type': 'PropertyValue',
        name: 'Annual CO2 emissions per capita',
        unitText: 't CO2 per person',
      },
    ]);
    expect(jsonLd.spatialCoverage).toEqual({
      '@type': 'Place',
      name: 'World',
      geo: { '@type': 'GeoShape', box: '-90 -180 90 180' },
    });
  });

  it('should credit the provider and point at its versioned license URL', () => {
    const jsonLd = build();

    expect(jsonLd.license).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(jsonLd.creator).toEqual({
      '@type': 'Organization',
      name: 'Our World in Data',
      url: 'https://ourworldindata.org',
    });
    expect(jsonLd.isBasedOn).toMatchObject({
      '@type': 'Dataset',
      name: 'Global Carbon Budget',
      version: '2025-11-13',
    });
    expect(jsonLd.includedInDataCatalog).toEqual({
      '@type': 'DataCatalog',
      name: 'eco-metrics earth data sources',
      url: DATA_SOURCES_URL,
    });
  });

  it('should fall back to the license name when its URL is unknown', () => {
    const jsonLd = build({ ...CO2_META, source: { ...CO2_META.source, license: 'ODbL 1.0' } });

    expect(jsonLd.license).toBe('ODbL 1.0');
  });
});

describe('JsonLd', () => {
  it('should render the data as an application/ld+json script', () => {
    const { container } = render(<JsonLd data={{ '@type': 'Dataset', name: 'Test' }} />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).not.toBeNull();
    expect(JSON.parse(script?.textContent ?? '')).toEqual({ '@type': 'Dataset', name: 'Test' });
  });

  it('should escape "<" so a value cannot close the script element', () => {
    const { container } = render(<JsonLd data={{ name: '</script><b>x</b>' }} />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script?.innerHTML).not.toContain('</script>');
    expect(script?.innerHTML).toContain('\\u003c/script>');
    expect(JSON.parse(script?.textContent ?? '')).toEqual({ name: '</script><b>x</b>' });
  });
});

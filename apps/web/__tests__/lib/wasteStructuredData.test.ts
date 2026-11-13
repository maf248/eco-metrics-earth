import { buildWasteDatasetJsonLd } from '@/lib/wasteStructuredData';

import { WASTE_FIXTURE, WASTE_META } from '../fixtures/wasteRecycling';

describe('buildWasteDatasetJsonLd', () => {
  const jsonLd = buildWasteDatasetJsonLd({
    data: WASTE_FIXTURE,
    meta: WASTE_META,
    pageUrl: 'https://example.org/waste-recycling/',
    dataSourcesUrl: 'https://example.org/data-sources/',
  });

  it('should describe a Dataset created by the World Bank under CC BY 4.0', () => {
    expect(jsonLd['@type']).toBe('Dataset');
    expect(jsonLd.creator).toMatchObject({ name: 'World Bank' });
    expect(jsonLd.license).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(jsonLd.url).toBe('https://example.org/waste-recycling/');
    expect(jsonLd.dateModified).toBe('2026-03-11');
  });

  it('should state the number of countries and the covered years', () => {
    expect(jsonLd.description).toContain(`${WASTE_FIXTURE.countries.length} countries`);
    expect(jsonLd.temporalCoverage).toBe('2022/2050');
  });
});

describe('buildWasteDatasetJsonLd source text', () => {
  it('should take the dataset title and citation from the payload, never a literal', () => {
    const data = {
      ...WASTE_FIXTURE,
      dataset: { title: 'Another Title', citation: 'Another citation 2030.' },
    };
    const jsonLd = buildWasteDatasetJsonLd({
      data,
      meta: WASTE_META,
      pageUrl: 'https://example.org/waste-recycling/',
      dataSourcesUrl: 'https://example.org/data-sources/',
    });

    const { provider, sourceUrl } = WASTE_META.source;
    expect(jsonLd.isBasedOn).toEqual({
      '@type': 'CreativeWork',
      name: 'Another Title',
      citation: 'Another citation 2030.',
      publisher: { '@type': 'Organization', name: provider, url: sourceUrl },
      url: sourceUrl,
    });
    expect(jsonLd.description).toContain('Another Title');
    expect(JSON.stringify(jsonLd)).not.toContain('What a Waste');
  });
});

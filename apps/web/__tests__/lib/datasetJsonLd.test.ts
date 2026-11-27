import {
  buildDatasetJsonLd,
  buildMultiProviderDatasetJsonLd,
  buildSourceWork,
  licenseUrl,
} from '@/lib/datasetJsonLd';

import { CO2_META } from '../fixtures/co2Emissions';

const fields = {
  name: 'A dataset, 1950–2025',
  description: 'Something measured for every country and the world.',
  keywords: ['one', 'two'],
  temporalCoverage: '1950/2025',
  variableMeasured: [{ '@type': 'PropertyValue', name: 'Thing', unitText: 'u' }],
  isBasedOn: [{ '@type': 'CreativeWork', name: 'Upstream A' }],
};

function build(meta = CO2_META) {
  return buildDatasetJsonLd({
    meta,
    pageUrl: 'https://eco-metrics.earth/thing/',
    dataSourcesUrl: 'https://eco-metrics.earth/data-sources/',
    fields,
  });
}

describe('buildDatasetJsonLd', () => {
  it('should pass the category fields through unchanged', () => {
    const jsonLd = build();

    expect(jsonLd.name).toBe(fields.name);
    expect(jsonLd.description).toBe(fields.description);
    expect(jsonLd.keywords).toEqual(fields.keywords);
    expect(jsonLd.temporalCoverage).toBe('1950/2025');
    expect(jsonLd.variableMeasured).toEqual(fields.variableMeasured);
    expect(jsonLd.isBasedOn).toEqual(fields.isBasedOn);
  });

  it('should derive the shared fields from the meta and the URLs', () => {
    const jsonLd = build();

    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      url: 'https://eco-metrics.earth/thing/',
      isAccessibleForFree: true,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      creator: {
        '@type': 'Organization',
        name: 'Our World in Data',
        url: 'https://ourworldindata.org',
      },
      dateModified: CO2_META.source.lastUpdated,
      spatialCoverage: { '@type': 'Place', name: 'World' },
      includedInDataCatalog: {
        '@type': 'DataCatalog',
        url: 'https://eco-metrics.earth/data-sources/',
      },
    });
  });

  it('should not declare a distribution', () => {
    expect(build()).not.toHaveProperty('distribution');
  });
});

describe('buildSourceWork', () => {
  it('should build a CreativeWork with the name, publisher and URL', () => {
    expect(
      buildSourceWork({
        name: 'Upstream A',
        url: 'https://example.org/a/',
        publisher: { name: 'Producer' },
      }),
    ).toEqual({
      '@type': 'CreativeWork',
      name: 'Upstream A',
      publisher: { '@type': 'Organization', name: 'Producer' },
      url: 'https://example.org/a/',
    });
  });

  it('should add the version, citation and publisher URL only when given', () => {
    expect(
      buildSourceWork({
        name: 'Upstream B',
        url: 'https://example.org/b/',
        publisher: { name: 'Publisher', url: 'https://example.org/' },
        version: '2026-01-01',
        citation: 'Someone (2026).',
      }),
    ).toEqual({
      '@type': 'CreativeWork',
      name: 'Upstream B',
      version: '2026-01-01',
      citation: 'Someone (2026).',
      publisher: { '@type': 'Organization', name: 'Publisher', url: 'https://example.org/' },
      url: 'https://example.org/b/',
    });
  });
});

describe('licenseUrl', () => {
  it.each([
    ['CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'],
    ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'],
    ['CC BY-NC-ND 3.0', 'https://creativecommons.org/licenses/by-nc-nd/3.0/'],
  ])('should map %s to its versioned Creative Commons URL', (license, url) => {
    expect(licenseUrl(license)).toBe(url);
  });

  it.each(['ODbL 1.0', 'CC0 1.0', 'Public domain'])('should keep %s as is', (license) => {
    expect(licenseUrl(license)).toBe(license);
  });
});

describe('buildMultiProviderDatasetJsonLd', () => {
  const other = {
    ...CO2_META,
    source: {
      provider: 'Another Provider',
      license: 'Public domain',
      sourceUrl: 'https://another.example',
      lastUpdated: '2030-01-01T00:00:00.000Z',
    },
  };
  const input = {
    pageUrl: 'https://eco-metrics.earth/thing/',
    dataSourcesUrl: 'https://eco-metrics.earth/data-sources/',
    fields,
  };

  it('should list every distinct provider as a creator and every distinct license', () => {
    const jsonLd = buildMultiProviderDatasetJsonLd({
      ...input,
      metas: [CO2_META, other, CO2_META],
    });

    expect(jsonLd.creator).toEqual([
      { '@type': 'Organization', name: 'Our World in Data', url: 'https://ourworldindata.org' },
      { '@type': 'Organization', name: 'Another Provider', url: 'https://another.example' },
    ]);
    expect(jsonLd.license).toEqual([
      'https://creativecommons.org/licenses/by/4.0/',
      'Public domain',
    ]);
  });

  it('should use the most recent update of any provider as dateModified', () => {
    const jsonLd = buildMultiProviderDatasetJsonLd({ ...input, metas: [CO2_META, other] });

    expect(jsonLd.dateModified).toBe('2030-01-01T00:00:00.000Z');
  });

  it('should collapse to the single-provider shape with one provider', () => {
    const multi = buildMultiProviderDatasetJsonLd({ ...input, metas: [CO2_META] });

    expect(multi).toEqual(buildDatasetJsonLd({ ...input, meta: CO2_META }));
  });

  it('should keep the shared fields of every dataset page', () => {
    const jsonLd = buildMultiProviderDatasetJsonLd({ ...input, metas: [CO2_META, other] });

    expect(jsonLd).toMatchObject({
      '@type': 'Dataset',
      name: fields.name,
      url: input.pageUrl,
      isBasedOn: fields.isBasedOn,
      includedInDataCatalog: { url: input.dataSourcesUrl },
    });
    expect(jsonLd).not.toHaveProperty('distribution');
  });
});

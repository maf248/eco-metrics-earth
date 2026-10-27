import { buildEnergyDatasetJsonLd } from '@/lib/energyStructuredData';

import { ENERGY_FIXTURE, ENERGY_META } from '../fixtures/energySources';

const data = { ...ENERGY_FIXTURE, startYear: 2000, endYear: 2025 };

interface JsonLd {
  '@type': string;
  name: string;
  url: string;
  temporalCoverage: string;
  description: string;
  license: string;
  creator: Record<string, string>;
  variableMeasured: { unitText: string }[];
  isBasedOn: { name: string; publisher: { name: string } }[];
}

function build() {
  return buildEnergyDatasetJsonLd({
    data,
    meta: ENERGY_META,
    pageUrl: 'https://example.com/energy-sources/',
    dataSourcesUrl: 'https://example.com/data-sources/',
  }) as unknown as JsonLd;
}

describe('buildEnergyDatasetJsonLd', () => {
  it('should build the name and coverage from the payload years', () => {
    const jsonLd = build();

    expect(jsonLd['@type']).toBe('Dataset');
    expect(jsonLd.name).toBe('Electricity generation mix by country, 2000–2025');
    expect(jsonLd.temporalCoverage).toBe('2000/2025');
    expect(jsonLd.url).toBe('https://example.com/energy-sources/');
  });

  it('should declare TWh and percent as the measured variables', () => {
    expect(build().variableMeasured.map((v) => v.unitText)).toEqual(['TWh', '%']);
  });

  it('should be based on the OWID dataset and the Ember dataset', () => {
    const basedOn = build().isBasedOn;

    expect(basedOn).toHaveLength(2);
    expect(basedOn[0]).toMatchObject({
      name: 'Electricity mix',
      version: '2026-06-30',
      publisher: { name: 'Our World in Data' },
    });
    expect(basedOn[1]).toMatchObject({
      name: 'Yearly Electricity Data',
      publisher: { name: 'Ember' },
      url: 'https://ember-energy.org/data/yearly-electricity-data/',
    });
  });

  it('should state electricity only and the grouping in the description', () => {
    const { description } = build();

    expect(description).toContain('Electricity only, not total energy');
    expect(description).toContain('bioenergy and other renewables are summed');
  });

  it('should carry the CC BY license and the OWID creator', () => {
    const jsonLd = build();

    expect(jsonLd.license).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(jsonLd.creator).toMatchObject({ '@type': 'Organization', name: 'Our World in Data' });
  });
});

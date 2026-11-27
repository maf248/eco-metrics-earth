import { buildOceanHealthDatasetJsonLd } from '@/lib/oceanHealthStructuredData';

import {
  COPERNICUS_META,
  NOAA_LSA_META,
  OCEAN_HEAT_FIXTURE,
  OCEAN_PH_FIXTURE,
  OCEAN_SEA_LEVEL_FIXTURE,
  OCEAN_SST_ANOMALY_FIXTURE,
  OCEAN_SST_DAILY_FIXTURE,
  OWID_OCEAN_META,
} from '../fixtures/oceanHealth';

const PAGE_URL = 'https://eco-metrics.earth/ocean-health/';
const DATA_SOURCES_URL = 'https://eco-metrics.earth/data-sources/';

const ALL = {
  sst: { data: OCEAN_SST_DAILY_FIXTURE, meta: COPERNICUS_META },
  anomaly: { data: OCEAN_SST_ANOMALY_FIXTURE, meta: OWID_OCEAN_META },
  heat: { data: OCEAN_HEAT_FIXTURE, meta: OWID_OCEAN_META },
  seaLevel: { data: OCEAN_SEA_LEVEL_FIXTURE, meta: NOAA_LSA_META },
  ph: { data: OCEAN_PH_FIXTURE, meta: OWID_OCEAN_META },
};

function build(sections: Parameters<typeof buildOceanHealthDatasetJsonLd>[0]['sections'] = ALL) {
  return buildOceanHealthDatasetJsonLd({
    sections,
    pageUrl: PAGE_URL,
    dataSourcesUrl: DATA_SOURCES_URL,
  });
}

interface Work {
  '@type': string;
  name: string;
  publisher: { name: string };
}

const works = (jsonLd: Record<string, unknown> | undefined): Work[] =>
  (jsonLd?.isBasedOn ?? []) as Work[];
const publishers = (jsonLd: Record<string, unknown> | undefined): string[] =>
  works(jsonLd).map(({ publisher }) => publisher.name);

describe('buildOceanHealthDatasetJsonLd', () => {
  it('should describe one schema.org Dataset at the canonical page URL', () => {
    const jsonLd = build();

    expect(jsonLd?.['@type']).toBe('Dataset');
    expect(jsonLd?.url).toBe(PAGE_URL);
    expect(jsonLd?.includedInDataCatalog).toMatchObject({ url: DATA_SOURCES_URL });
    expect(jsonLd?.isAccessibleForFree).toBe(true);
  });

  it('should credit every provider and origin of the five sections in isBasedOn', () => {
    const names = publishers(build());

    for (const expected of [
      'Copernicus Climate Pulse',
      'Copernicus Climate Change Service (C3S) / ECMWF',
      'Our World in Data',
      'Met Office Hadley Centre',
      'NOAA National Centers for Environmental Information',
      'United States Environmental Protection Agency',
      'IAP',
      'MRI/JMA',
      'NOAA Laboratory for Satellite Altimetry',
      'School of Ocean & Earth Science & Technology',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('should type every source CreativeWork, never Dataset', () => {
    expect(works(build()).every((work) => work['@type'] === 'CreativeWork')).toBe(true);
  });

  it('should credit CSIRO when a source of the payload names it', () => {
    const withCsiro = {
      ...ALL,
      heat: {
        ...ALL.heat,
        data: {
          ...OCEAN_HEAT_FIXTURE,
          depths: [
            OCEAN_HEAT_FIXTURE.depths[0],
            {
              ...OCEAN_HEAT_FIXTURE.depths[1],
              sources: [{ id: 'csiro', name: 'CSIRO', values: [1, 2, 3, 4, 5] }],
            },
          ],
        },
      },
    };

    expect(publishers(build(withCsiro))).toContain('CSIRO');
  });

  it('should credit Our World in Data once per dataset it republishes and NOAA LSA once', () => {
    const names = publishers(build());

    expect(names.filter((name) => name === 'Our World in Data')).toHaveLength(4);
    expect(names.filter((name) => name === 'NOAA Laboratory for Satellite Altimetry')).toHaveLength(
      1,
    );
  });

  it('should declare one variable per present section', () => {
    expect(build()?.variableMeasured as unknown[]).toHaveLength(5);
  });

  it('should take every creator and license from the present providers', () => {
    const jsonLd = build();

    expect((jsonLd?.creator as { name: string }[]).map(({ name }) => name)).toEqual([
      'Copernicus Climate Pulse',
      'Our World in Data',
      'NOAA Laboratory for Satellite Altimetry',
    ]);
    expect(jsonLd?.license).toEqual([
      'https://creativecommons.org/licenses/by/4.0/',
      'Public domain',
    ]);
    expect(jsonLd?.dateModified).toBe('2026-11-24T08:00:00.000Z');
  });

  it('should cover the earliest start to the latest end of the present sections', () => {
    expect(build()?.temporalCoverage).toBe('1988-10-31/2025-02-15');
  });

  it('should describe only the present sections: nothing about sea level without it', () => {
    const { seaLevel, ...rest } = ALL;
    void seaLevel;
    const jsonLd = build(rest);

    expect(publishers(jsonLd)).not.toContain('NOAA Laboratory for Satellite Altimetry');
    expect(JSON.stringify(jsonLd?.variableMeasured)).not.toContain('sea level');
    expect(jsonLd?.description).not.toContain('sea level anomaly');
    expect((jsonLd?.variableMeasured as unknown[]).length).toBe(4);
    expect(jsonLd?.temporalCoverage).toBe('1988-10-31/2024-12-31');
  });

  it('should use a single creator and license when one provider remains', () => {
    const jsonLd = build({ sst: ALL.sst });

    expect(jsonLd?.creator).toMatchObject({ name: 'Copernicus Climate Pulse' });
    expect(jsonLd?.license).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(jsonLd?.temporalCoverage).toBe('2022-01-01/2024-04-09');
  });

  it('should return nothing when no section is present', () => {
    expect(build({})).toBeUndefined();
  });
});

import { readFileSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

import type { MetricSeries } from '@eco-metrics/shared';
import { listCountryEntityCodes } from '@eco-metrics/shared';

import { ProviderDataError } from '../../src/common/errors/provider-error';
import {
  buildGlobalTemperatureData,
  buildGlobalSeries,
  type BuildGlobalTemperatureInput,
  type GlobalSeriesInput,
} from '../../src/modules/global-temperature/global-temperature.service';
import type { OwidIndicatorMetadata } from '../../src/modules/providers/owid/owid.types';
import {
  parseGrapherTable,
  selectGrapherColumn,
} from '../../src/modules/providers/owid/parseGrapherCsv';

const FIXTURES = join(__dirname, 'fixtures');

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

function fixtureSeries(): MetricSeries[] {
  return selectGrapherColumn(
    parseGrapherTable(readFixture('annual-temperature-anomalies.csv')),
    'temperature_anomaly',
  );
}

function fixtureMetadata(
  overrides: Partial<OwidIndicatorMetadata> = {},
  file = 'indicator-1325256-metadata.json',
): OwidIndicatorMetadata {
  const raw = JSON.parse(readFixture(file)) as Record<string, unknown> & {
    dimensions: { entities: { values: OwidIndicatorMetadata['entities'] } };
  };
  return {
    id: raw.id as number,
    name: raw.name as string,
    unit: raw.unit as string,
    shortUnit: raw.shortUnit as string,
    datasetName: raw.datasetName as string,
    datasetVersion: raw.datasetVersion as string,
    timespan: raw.timespan as string,
    updatedAt: raw.updatedAt as string,
    descriptionShort: raw.descriptionShort as string,
    entities: raw.dimensions.entities.values,
    ...overrides,
  };
}

function globalColumn(column: string): MetricSeries[] {
  return selectGrapherColumn(parseGrapherTable(readFixture('temperature-anomaly.csv')), column);
}

function globalInput(overrides: Partial<GlobalSeriesInput> = {}): GlobalSeriesInput {
  return {
    mean: globalColumn('near_surface_temperature_anomaly'),
    lower: globalColumn('near_surface_temperature_anomaly_lower'),
    upper: globalColumn('near_surface_temperature_anomaly_upper'),
    metadata: fixtureMetadata({}, 'indicator-1325020-metadata.json'),
    ...overrides,
  };
}

function fixtureInput(
  overrides: Partial<BuildGlobalTemperatureInput> = {},
): BuildGlobalTemperatureInput {
  return {
    anomaly: fixtureSeries(),
    metadata: fixtureMetadata(),
    global: globalInput(),
    maxYear: 2025,
    allowedCodes: new Set(listCountryEntityCodes()),
    ...overrides,
  };
}

function entity(input: BuildGlobalTemperatureInput, code: string) {
  const found = buildGlobalTemperatureData(input).data.entities.find((e) => e.code === code);
  if (!found) {
    throw new Error(`entity ${code} not in result`);
  }
  return found;
}

function makeSeries(code: string, name: string, values: (number | null)[]): MetricSeries {
  return {
    entityCode: code,
    entityName: name,
    points: values.map((value, index) => ({ year: 1940 + index, value })),
  };
}

describe('buildGlobalTemperatureData', () => {
  it('should align every entity array with the year range of the data', () => {
    const { data } = buildGlobalTemperatureData(fixtureInput());

    expect(data.startYear).toBe(1940);
    expect(data.endYear).toBe(1942);
    for (const { anomaly } of data.entities) {
      expect(anomaly).toHaveLength(3);
    }
  });

  it('should keep a missing year as null so the arrays never shift', () => {
    expect(entity(fixtureInput(), 'ARG').anomaly).toEqual([-1.46, null, -1.04]);
  });

  it('should round to two decimals and keep negative values', () => {
    expect(entity(fixtureInput(), 'OWID_WRL').anomaly).toEqual([-0.69, -0.64, -0.73]);
  });

  it('should round 0.5916424 to 0.59 and -0.84749717 to -0.85', () => {
    const { data } = buildGlobalTemperatureData(
      fixtureInput({
        anomaly: [makeSeries('OWID_WRL', 'World', [0.5916424, -0.84749717])],
      }),
    );

    expect(data.entities[0].anomaly).toEqual([0.59, -0.85]);
  });

  it('should serve a value that rounds to zero as 0, never -0', () => {
    const usa = entity(fixtureInput(), 'USA');

    expect(usa.anomaly[1]).toBe(0);
    expect(Object.is(usa.anomaly[1], -0)).toBe(false);
  });

  it('should drop aggregates, unknown codes and entities without any value', () => {
    const codes = buildGlobalTemperatureData(
      fixtureInput({
        anomaly: [...fixtureSeries(), makeSeries('AFG', 'Afghanistan', [null, null, null])],
      }),
    ).data.entities.map(({ code }) => code);

    expect(codes).not.toContain('OWID_EUR');
    expect(codes).not.toContain('ZZZ');
    expect(codes).not.toContain('AFG');
  });

  it('should put World first, then countries by name, with flag codes', () => {
    const { entities } = buildGlobalTemperatureData(fixtureInput()).data;

    expect(entities.map(({ code, iso2 }) => [code, iso2])).toEqual([
      ['OWID_WRL', null],
      ['ARG', 'AR'],
      ['OWID_KOS', 'XK'],
      ['USA', 'US'],
    ]);
  });

  it('should be deterministic for the same input', () => {
    expect(buildGlobalTemperatureData(fixtureInput())).toEqual(
      buildGlobalTemperatureData(fixtureInput()),
    );
  });

  it('should carry the unit, the baseline, the dataset identity and the provider timestamp', () => {
    const { data, lastUpdated } = buildGlobalTemperatureData(fixtureInput());

    expect(data.unit).toBe('°C');
    expect(data.baseline).toEqual({ startYear: 1991, endYear: 2020 });
    expect(data.dataset).toEqual({
      name: 'Annual surface temperatures and anomalies by country',
      version: '2026-10-12',
    });
    expect(lastUpdated).toBe('2026-10-13T08:42:32.000Z');
  });

  describe('previous-year cap', () => {
    it('should not serve a current-year row of the per-country series', () => {
      const withPartialYear = fixtureSeries().map((series) =>
        series.entityCode === 'OWID_WRL'
          ? { ...series, points: [...series.points, { year: 2026, value: 0.9 }] }
          : series,
      );

      const { data } = buildGlobalTemperatureData(
        fixtureInput({ anomaly: withPartialYear, maxYear: 2025 }),
      );

      expect(data.endYear).toBe(1942);
      expect(data.entities.every(({ anomaly }) => anomaly.length === 3)).toBe(true);
    });
  });

  describe('baseline guard', () => {
    it.each(['In 11991-2020 the mean', 'the 1991-20201 mean'])(
      'should not match a longer number run in %s',
      (descriptionShort) => {
        const metadata = fixtureMetadata({ descriptionShort });

        expect(() => buildGlobalTemperatureData(fixtureInput({ metadata }))).toThrow(
          ProviderDataError,
        );
      },
    );

    it('should accept a hyphen in the description', () => {
      const metadata = fixtureMetadata({ descriptionShort: 'From the 1991-2020 mean.' });

      expect(() => buildGlobalTemperatureData(fixtureInput({ metadata }))).not.toThrow();
    });

    it('should accept an en dash in the description', () => {
      const metadata = fixtureMetadata({ descriptionShort: 'From the 1991–2020 mean.' });

      expect(() => buildGlobalTemperatureData(fixtureInput({ metadata }))).not.toThrow();
    });

    it('should reject a description that names another baseline', () => {
      const metadata = fixtureMetadata({ descriptionShort: 'From the 2001-2030 mean.' });

      expect(() => buildGlobalTemperatureData(fixtureInput({ metadata }))).toThrow(
        ProviderDataError,
      );
    });

    it('should reject a missing description', () => {
      const metadata = fixtureMetadata({ descriptionShort: null });

      expect(() => buildGlobalTemperatureData(fixtureInput({ metadata }))).toThrow(
        'no short description',
      );
    });
  });

  describe('upstream origin', () => {
    it('should complete the credit notice with the year of the dataset version', () => {
      const { origin } = buildGlobalTemperatureData(fixtureInput()).data;

      expect(origin).toEqual({
        producer: 'Copernicus Climate Change Service (C3S)',
        title: 'ERA5 monthly averaged data on single levels from 1940 to present',
        url: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means',
        license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
        notice: 'Contains modified Copernicus Climate Change Service information (2026)',
        citation: expect.stringContaining('doi:10.24381/cds.f17050d7'),
        disclaimer: expect.stringContaining('Neither the European Commission nor ECMWF'),
      });
    });

    it('should use the year of another dataset version', () => {
      const metadata = fixtureMetadata({ datasetVersion: '2027-01-05' });

      const { origin } = buildGlobalTemperatureData(fixtureInput({ metadata })).data;

      expect(origin.notice).toBe(
        'Contains modified Copernicus Climate Change Service information (2027)',
      );
    });

    it('should reject a dataset version that does not start with a year', () => {
      const metadata = fixtureMetadata({ datasetVersion: 'latest' });

      expect(() => buildGlobalTemperatureData(fixtureInput({ metadata }))).toThrow(
        ProviderDataError,
      );
    });
  });

  describe('unusable provider content', () => {
    it('should reject a response without the World entity', () => {
      const anomaly = fixtureSeries().filter(({ entityCode }) => entityCode !== 'OWID_WRL');

      expect(() => buildGlobalTemperatureData(fixtureInput({ anomaly }))).toThrow(
        'Global temperature response has no World entity',
      );
    });

    it('should reject a response without any value', () => {
      const anomaly = [makeSeries('OWID_WRL', 'World', [null, null])];

      expect(() => buildGlobalTemperatureData(fixtureInput({ anomaly }))).toThrow(
        'Global temperature response has no value in any year',
      );
    });

    it('should reject a World series with fewer than two years of values', () => {
      const anomaly = [makeSeries('OWID_WRL', 'World', [0.4]), makeSeries('ARG', 'Argentina', [1])];

      expect(() => buildGlobalTemperatureData(fixtureInput({ anomaly }))).toThrow(
        'fewer than 2 years of values for World',
      );
    });
  });
});

describe('buildGlobalSeries', () => {
  const build = (input = globalInput(), maxYear = 2025) => buildGlobalSeries(input, maxYear);
  const row = (code: string, year: number, value: number | null): MetricSeries => ({
    entityCode: code,
    entityName: code,
    points: [{ year, value }],
  });

  it('should align the mean and its bounds from 1850 and round to two decimals', () => {
    const global = build();

    expect(global.startYear).toBe(1850);
    expect(global.endYear).toBe(1852);
    expect(global.baseline).toEqual({ startYear: 1861, endYear: 1890 });
    expect(global.mean).toEqual([-0.06, 0.1, 0.14]);
    expect(global.upper).toEqual([0.11, 0.27, 0.3]);
  });

  it('should leave a blank bound as null in the affected array only', () => {
    const { lower, mean } = build();

    expect(lower).toEqual([-0.24, null, -0.02]);
    expect(mean.every((value) => value !== null)).toBe(true);
  });

  it('should ignore the hemispheres', () => {
    const global = build();

    expect(global.mean).not.toContain(9.99);
    expect(global.upper).not.toContain(10.5);
  });

  it('should round 1.4119903, 1.3725953 and 1.4513854 to 1.41, 1.37 and 1.45', () => {
    const world = (value: number): MetricSeries[] => [
      {
        entityCode: 'OWID_WRL',
        entityName: 'World',
        points: [
          { year: 1850, value },
          { year: 1851, value },
        ],
      },
    ];

    const global = build(
      globalInput({ mean: world(1.4119903), lower: world(1.3725953), upper: world(1.4513854) }),
    );

    expect([global.mean[0], global.lower[0], global.upper[0]]).toEqual([1.41, 1.37, 1.45]);
  });

  it('should drop the partial current year', () => {
    const withPartialYear = globalInput({
      mean: [...globalColumn('near_surface_temperature_anomaly'), row('OWID_WRL', 2026, 1.41)],
    });

    expect(build(withPartialYear, 2025).endYear).toBe(1852);
  });

  it('should carry the OWID dataset identity and the HadCRUT5 origin', () => {
    const global = build();

    expect(global.dataset).toEqual({
      name: 'Climate Change Impacts - Annual',
      version: '2026-10-12',
    });
    expect(global.origin).toMatchObject({
      producer: 'Met Office Hadley Centre',
      title: 'HadCRUT5',
      license: { name: 'Open Government Licence v3.0' },
      citation: expect.stringContaining('Morice et al. (2021)'),
    });
    expect(global.origin.citation).toContain('doi:10.1029/2019JD032361');
  });

  it.each([
    ['a hyphen', 'compared to the 1861-1890 mean'],
    ['an en dash', 'compared to the 1861\u20131890 mean'],
  ])('should accept the baseline written with %s', (_label, descriptionShort) => {
    const metadata = fixtureMetadata({ descriptionShort }, 'indicator-1325020-metadata.json');

    expect(() => build(globalInput({ metadata }))).not.toThrow();
  });

  it.each([
    ['another baseline', 'compared to the 1961-1990 mean'],
    ['no description', null],
  ])('should reject %s', (_label, descriptionShort) => {
    const metadata = fixtureMetadata({ descriptionShort }, 'indicator-1325020-metadata.json');

    expect(() => build(globalInput({ metadata }))).toThrow(ProviderDataError);
  });

  it('should reject a response without the World entity', () => {
    expect(() => build(globalInput({ mean: [row('OWID_NH', 1850, 1)] }))).toThrow(
      'no World entity',
    );
  });

  it('should reject a response without any value', () => {
    const empty = [makeSeries('OWID_WRL', 'World', [null, null])];

    expect(() => build(globalInput({ mean: empty, lower: empty, upper: empty }))).toThrow(
      'no value in any year',
    );
  });

  it('should reject a World series with fewer than two years of values', () => {
    const one = [
      { entityCode: 'OWID_WRL', entityName: 'World', points: [{ year: 1850, value: 1 }] },
    ];

    expect(() => build(globalInput({ mean: one, lower: one, upper: one }))).toThrow(
      'fewer than 2 years',
    );
  });
});

describe('buildGlobalTemperatureData with the global series', () => {
  it('should attach the global block to the payload', () => {
    const { data } = buildGlobalTemperatureData(fixtureInput());

    expect(data.global.mean).toHaveLength(3);
    expect(data.global.origin.producer).toBe('Met Office Hadley Centre');
  });

  it('should use the latest timestamp across the per-country and global indicators', () => {
    const newer = fixtureMetadata(
      { updatedAt: '2026-11-01T00:00:00.000Z' },
      'indicator-1325020-metadata.json',
    );

    const { lastUpdated } = buildGlobalTemperatureData(
      fixtureInput({ global: globalInput({ metadata: newer }) }),
    );
    const older = buildGlobalTemperatureData(fixtureInput()).lastUpdated;

    expect(lastUpdated).toBe('2026-11-01T00:00:00.000Z');
    expect(older).toBe('2026-10-13T08:42:32.000Z');
  });

  it('should fail the whole payload when the global series is unusable', () => {
    const metadata = fixtureMetadata(
      { descriptionShort: 'compared to the 1961-1990 mean' },
      'indicator-1325020-metadata.json',
    );

    expect(() =>
      buildGlobalTemperatureData(fixtureInput({ global: globalInput({ metadata }) })),
    ).toThrow(ProviderDataError);
  });
});

describe('global temperature payload size', () => {
  it('should stay under 45 KB gzipped for a full-size dataset with the global block', () => {
    const codes = listCountryEntityCodes();
    const years = 86;
    // Deterministic pseudo-random walk so the sample compresses like real data does.
    let seed = 12345;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const series = codes.map((code) => ({
      entityCode: code,
      entityName: code === 'OWID_WRL' ? 'World' : `Country ${code}`,
      points: Array.from({ length: years }, (_, index) => ({
        year: 1940 + index,
        value: (next() - 0.5) * 3,
      })),
    }));

    const globalYears = (value: () => number): MetricSeries[] => [
      {
        entityCode: 'OWID_WRL',
        entityName: 'World',
        points: Array.from({ length: 176 }, (_, index) => ({ year: 1850 + index, value: value() })),
      },
    ];
    const { data } = buildGlobalTemperatureData(
      fixtureInput({
        anomaly: series,
        allowedCodes: new Set(codes),
        global: globalInput({
          mean: globalYears(() => (next() - 0.5) * 3),
          lower: globalYears(() => (next() - 0.5) * 3),
          upper: globalYears(() => (next() - 0.5) * 3),
        }),
      }),
    );
    const gzipped = gzipSync(JSON.stringify(data)).length;

    expect(data.entities.length).toBeGreaterThan(190);
    expect(gzipped).toBeLessThan(45 * 1024);
  });
});

import { ProviderDataError } from '../../src/common/errors/provider-error';
import {
  buildOceanSeaLevelData,
  decimalYearToIsoDate,
} from '../../src/modules/ocean-health/ocean-sea-level.service';
import type { NoaaLsaFile } from '../../src/modules/providers/noaa-lsa/noaa-lsa-client.service';
import { parseNoaaLsaCsv } from '../../src/modules/providers/noaa-lsa/noaa-lsa.parser';

import { fixture } from './helpers';

const RETRIEVED_AT = '2026-11-24T09:00:00.000Z';

function file(overrides: Partial<NoaaLsaFile> = {}): NoaaLsaFile {
  return {
    ...parseNoaaLsaCsv(fixture('slr_sla_gbl_free_ref_90.csv')),
    retrievedAt: RETRIEVED_AT,
    ...overrides,
  };
}

describe('decimalYearToIsoDate', () => {
  it('should put 2025.1268 in February 2025', () => {
    expect(decimalYearToIsoDate(2025.1268)).toMatch(/^2025-02-/);
  });

  it('should start a year on 1 January', () => {
    expect(decimalYearToIsoDate(2025)).toBe('2025-01-01');
  });

  it('should respect leap years: half of 2024 and half of 2023 both fall on 2 July', () => {
    expect(decimalYearToIsoDate(2024.5)).toBe('2024-07-02');
    expect(decimalYearToIsoDate(2023.5)).toBe('2023-07-02');
    expect(decimalYearToIsoDate(2024.162)).toBe('2024-02-29');
  });
});

describe('buildOceanSeaLevelData', () => {
  it('should serve only the missions with values, each with its own aligned dates', () => {
    const { data } = buildOceanSeaLevelData(file());

    expect(data.missions.map(({ id, name }) => [id, name])).toEqual([
      ['topex-poseidon', 'TOPEX/Poseidon'],
      ['jason-1', 'Jason-1'],
      ['jason-3', 'Jason-3'],
      ['sentinel-6mf', 'Sentinel-6MF'],
    ]);
    for (const { dates, values } of data.missions) {
      expect(dates.length).toBe(values.length);
      expect(dates.length).toBeGreaterThan(0);
      expect(values.every((value) => Number.isFinite(value))).toBe(true);
    }
    expect(data.missions[0].values[0]).toBe(-19.33);
  });

  it('should derive the start and end dates from the data', () => {
    const { data } = buildOceanSeaLevelData(file());

    expect(data.startDate).toBe(data.missions[0].dates[0]);
    expect(data.startDate).toMatch(/^1992-12-/);
    const sentinel = data.missions[3];
    expect(data.endDate).toBe(sentinel.dates.at(-1));
    expect(data.endDate).toMatch(/^2025-02-/);
  });

  it('should parse the trend of the file header', () => {
    expect(buildOceanSeaLevelData(file()).data.trend).toEqual({
      value: 3.11,
      unit: 'mm/year',
      note: 'no glacial isostatic adjustment correction',
    });
  });

  it('should credit NOAA with the verbatim acknowledgment and use the retrieval time', () => {
    const result = buildOceanSeaLevelData(file());

    expect(result.data.unit).toBe('mm');
    expect(result.data.origin.notice).toBe(
      'Altimetry data are provided by NOAA Laboratory for Satellite Altimetry.',
    );
    expect(result.lastUpdated).toBe(RETRIEVED_AT);
  });

  it('should give a different end date when the file ends in another month', () => {
    const result = buildOceanSeaLevelData(
      file({
        missions: ['A'],
        rows: [
          { year: 2024.5, values: [1] },
          { year: 2025.7, values: [2] },
        ],
      }),
    );

    expect(result.data.endDate).toMatch(/^2025-09-/);
    expect(result.data.startDate).toBe('2024-07-02');
  });

  it('should throw ProviderDataError when no mission has a value', () => {
    expect(() =>
      buildOceanSeaLevelData(file({ missions: ['A'], rows: [{ year: 2000.5, values: [null] }] })),
    ).toThrow(ProviderDataError);
  });

  describe('annual', () => {
    it('should average each mission by calendar year on one shared year range', () => {
      const { data } = buildOceanSeaLevelData(
        file({
          missions: ['A', 'B'],
          rows: [
            { year: 2001.1, values: [10, null] },
            { year: 2001.6, values: [20, null] },
            { year: 2002.5, values: [30, 25] },
            { year: 2003.5, values: [null, 40] },
          ],
        }),
      );

      expect(data.annual).toEqual({
        startYear: 2001,
        endYear: 2003,
        missions: [
          { id: 'a', name: 'A', values: [15, 30, null] },
          { id: 'b', name: 'B', values: [null, 25, 40] },
        ],
      });
    });

    it('should round the yearly mean to 2 decimals', () => {
      const { data } = buildOceanSeaLevelData(
        file({ missions: ['A'], rows: [{ year: 2010.5, values: [10.12345] }] }),
      );

      expect(data.annual.missions[0].values).toEqual([10.12]);
    });

    it('should span the fixture missions, one column per served mission', () => {
      const { data } = buildOceanSeaLevelData(file());

      expect(data.annual.startYear).toBe(1992);
      expect(data.annual.endYear).toBe(2025);
      expect(data.annual.missions.map(({ id }) => id)).toEqual(data.missions.map(({ id }) => id));
      for (const { values } of data.annual.missions) {
        expect(values).toHaveLength(2025 - 1992 + 1);
      }
    });
  });
});

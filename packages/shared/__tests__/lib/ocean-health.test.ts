import type {
  ApiResponse,
  DataSourceOrigin,
  OceanHeatContentData,
  OceanPhData,
  OceanSeaLevelData,
  OceanSstAnomalyData,
  OceanSstDailyData,
  OceanSstDailyPoint,
} from '../../src';

const origin: DataSourceOrigin = {
  producer: 'Producer',
  title: 'Title',
  url: 'https://example.org/',
  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
};

const point: OceanSstDailyPoint = {
  date: '2026-11-22',
  sst: 20.875,
  climatology: 20.117,
  anomaly: -0.12,
  status: 'preliminary',
};

describe('ocean health wire types', () => {
  it('should accept null slots and a negative anomaly in the daily payload', () => {
    const data: OceanSstDailyData = {
      unit: '°C',
      coverage: '60°S–60°N',
      baseline: { startYear: 1991, endYear: 2020 },
      startYear: 1979,
      endYear: 2026,
      years: [{ year: 2026, values: [20.5, null] }],
      climatology: [20.2, null],
      latest: point,
      record: { ...point, status: 'final' },
      recent: [point],
      origin,
    };

    expect(data.years[0].values[1]).toBeNull();
    expect(data.latest.anomaly).toBeLessThan(0);
    expect(data.record.status).toBe('final');
  });

  it('should accept null bounds in the anomaly regions', () => {
    const data: OceanSstAnomalyData = {
      startYear: 1850,
      endYear: 1851,
      unit: '°C',
      baseline: { startYear: 1861, endYear: 1890 },
      dataset: { name: 'HadSST', version: '2026-01-01' },
      origin,
      regions: [
        { code: 'OWID_WRL', name: 'World', mean: [-0.3, null], lower: [null, null], upper: [0, 0] },
      ],
    };

    expect(data.regions[0].mean[0]).toBe(-0.3);
  });

  it('should accept sources with gaps in both depths', () => {
    const data: OceanHeatContentData = {
      startYear: 1955,
      endYear: 1956,
      unit: '10²² J',
      depths: [
        {
          id: '700m',
          label: '0-700 m',
          dataset: { name: 'Heat', version: '1' },
          sources: [{ id: 'csiro', name: 'CSIRO', values: [-5, null] }],
        },
      ],
      origins: [origin],
    };

    expect(data.depths[0].sources[0].values[1]).toBeNull();
  });

  it('should type a sea level envelope with its meta', () => {
    const response: ApiResponse<OceanSeaLevelData> = {
      success: true,
      status: 200,
      data: {
        unit: 'mm',
        startDate: '1992-12-17',
        endDate: '2025-02-14',
        trend: { value: 3.11, unit: 'mm/year', note: 'no glacial isostatic adjustment correction' },
        missions: [{ id: 'jason-3', name: 'Jason-3', dates: ['2025-02-14'], values: [83.6] }],
        annual: {
          startYear: 2024,
          endYear: 2025,
          missions: [{ id: 'jason-3', name: 'Jason-3', values: [null, 83.6] }],
        },
        origin,
      },
      meta: {
        source: {
          provider: 'NOAA Laboratory for Satellite Altimetry',
          license: 'Public domain',
          sourceUrl: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/',
          lastUpdated: '2026-11-24',
        },
        fetchedAt: '2026-11-24',
        stale: false,
      },
    };

    expect(response.success).toBe(true);
  });

  it('should accept aligned monthly and rolling pH values with nulls', () => {
    const data: OceanPhData = {
      unit: 'pH',
      station: 'Hawaii',
      dates: ['2024-11-15', '2024-12-15'],
      monthly: [8.06, null],
      yearlyAverage: [null, 8.07],
      dataset: { name: 'HOT', version: '2025' },
      origin,
    };

    expect(data.monthly).toHaveLength(data.dates.length);
  });
});

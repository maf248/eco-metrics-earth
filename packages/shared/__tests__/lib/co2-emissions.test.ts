import type {
  ApiResponse,
  Co2EmissionsData,
  Co2EmissionsEntity,
  Co2EmissionsMetric,
} from '../../src';

describe('CO2 emissions wire types', () => {
  it('should allow null elements for unreported years', () => {
    const entity: Co2EmissionsEntity = {
      code: 'ARG',
      iso2: 'AR',
      name: 'Argentina',
      total: [1.5, null, 1.7],
      perCapita: [null, 0.5, 0.6],
    };

    expect(entity.total[1]).toBeNull();
    expect(entity.perCapita[0]).toBeNull();
  });

  it('should accept a null iso2 for World', () => {
    const world: Co2EmissionsEntity = {
      code: 'OWID_WRL',
      iso2: null,
      name: 'World',
      total: [1],
      perCapita: [1],
    };

    expect(world.iso2).toBeNull();
  });

  it('should type the metric as total or perCapita', () => {
    const metrics: Co2EmissionsMetric[] = ['total', 'perCapita'];

    expect(metrics).toHaveLength(2);
  });

  it('should type the endpoint success envelope with meta', () => {
    const data: Co2EmissionsData = {
      startYear: 1950,
      endYear: 1950,
      units: { total: 'Mt CO2', perCapita: 't CO2 per person' },
      dataset: { name: 'Global Carbon Budget', version: '2025-11-13' },
      origin: {
        producer: 'Global Carbon Project',
        title: 'Global Carbon Budget',
        url: 'https://globalcarbonbudget.org/',
        license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
      },
      entities: [],
    };
    const response: ApiResponse<Co2EmissionsData> = {
      success: true,
      status: 200,
      data,
      meta: {
        source: {
          provider: 'Our World in Data',
          license: 'CC BY 4.0',
          sourceUrl: 'https://ourworldindata.org',
          lastUpdated: '2026-10-22T21:47:04.000Z',
        },
        fetchedAt: '2026-10-24T00:00:00.000Z',
      },
    };

    expect(response.success).toBe(true);
  });
});

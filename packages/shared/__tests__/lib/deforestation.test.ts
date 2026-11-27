import {
  TREE_COVER_LOSS_DRIVER_IDS,
  type ApiResponse,
  type ForestAreaData,
  type ForestAreaEntity,
  type TreeCoverLossData,
  type TreeCoverLossDriverId,
  type TreeCoverLossEntity,
} from '../../src';

const ORIGIN = {
  producer: 'Producer',
  title: 'Dataset',
  url: 'https://example.org/',
  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
};

function emptyDrivers(): Record<TreeCoverLossDriverId, (number | null)[]> {
  return {
    permanentAgriculture: [1, null],
    hardCommodities: [null, null],
    settlementsInfrastructure: [null, null],
    shiftingCultivation: [null, null],
    logging: [null, null],
    wildfire: [null, null],
    otherNaturalDisturbances: [null, null],
  };
}

describe('deforestation wire types', () => {
  it('should keep the seven drivers in their stacking order', () => {
    expect(TREE_COVER_LOSS_DRIVER_IDS).toEqual([
      'permanentAgriculture',
      'hardCommodities',
      'settlementsInfrastructure',
      'shiftingCultivation',
      'logging',
      'wildfire',
      'otherNaturalDisturbances',
    ]);
  });

  it('should allow null elements and a null iso2 for World in forest area', () => {
    const world: ForestAreaEntity = {
      code: 'OWID_WRL',
      iso2: null,
      name: 'World',
      area: [4_343_532_500, null],
      share: [33.47, null],
    };
    const data: ForestAreaData = {
      startYear: 1990,
      endYear: 1991,
      units: { area: 'hectares', share: '% of land area' },
      dataset: { name: 'Global Forest Resources Assessment', version: '2025-12-05' },
      origin: ORIGIN,
      entities: [world],
    };
    const response: ApiResponse<ForestAreaData> = {
      success: true,
      status: 200,
      data,
      meta: {
        source: {
          provider: 'Our World in Data',
          license: 'CC BY 4.0',
          sourceUrl: 'https://ourworldindata.org',
          lastUpdated: 'x',
        },
        fetchedAt: 'x',
        stale: false,
      },
    };

    expect(response.success && response.data.entities[0].area[1]).toBeNull();
  });

  it('should carry one array per driver id on a tree cover loss entity', () => {
    const entity: TreeCoverLossEntity = {
      code: 'BRA',
      iso2: 'BR',
      name: 'Brazil',
      ...emptyDrivers(),
    };
    const data: TreeCoverLossData = {
      startYear: 2001,
      endYear: 2002,
      unit: 'hectares',
      dataset: { name: 'Tree cover loss', version: '2025-08-26' },
      origin: ORIGIN,
      drivers: TREE_COVER_LOSS_DRIVER_IDS.map((id) => ({ id, name: id })),
      entities: [entity],
    };

    for (const id of TREE_COVER_LOSS_DRIVER_IDS) {
      expect(data.entities[0][id]).toHaveLength(2);
    }
  });
});

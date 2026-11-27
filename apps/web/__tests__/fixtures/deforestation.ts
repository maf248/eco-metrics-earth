import type {
  ApiResponseMeta,
  DataSourceOrigin,
  ForestAreaData,
  ForestAreaEntity,
  TreeCoverLossData,
  TreeCoverLossDriver,
  TreeCoverLossEntity,
} from '@eco-metrics/shared';

const FOREST_START = 1990;
const FOREST_END = 2025;

/** Linear path between two real endpoints (FAO reports at intervals and OWID interpolates). */
function interpolate(first: number, last: number, decimals: number): number[] {
  const steps = FOREST_END - FOREST_START;
  const factor = 10 ** decimals;
  return Array.from(
    { length: steps + 1 },
    (_, index) => Math.round((first + ((last - first) * index) / steps) * factor) / factor,
  );
}

function forestEntity(
  code: string,
  iso2: string | null,
  name: string,
  area: [number, number],
  share: [number, number],
): ForestAreaEntity {
  return {
    code,
    iso2,
    name,
    area: interpolate(area[0], area[1], 0),
    share: interpolate(share[0], share[1], 2),
  };
}

export const FAO_ORIGIN: DataSourceOrigin = {
  producer: 'Food and Agriculture Organization of the United Nations',
  title: 'Global Forest Resources Assessment 2025',
  url: 'https://www.fao.org/forest-resources-assessment/en',
  license: {
    name: 'CC BY 4.0',
    url: 'https://www.fao.org/contact-us/terms/db-terms-of-use/en',
  },
  notice: 'FAO. 2025. Global Forest Resources Assessment 2025. Licence: CC-BY-4.0.',
  citation: 'FAO. 2025. Global Forest Resources Assessment 2025. Rome.',
};

export const GFW_ORIGIN: DataSourceOrigin = {
  producer: 'World Resources Institute and Google DeepMind (Global Forest Watch)',
  title: 'Tree cover loss by dominant driver (Sims et al., 2025)',
  url: 'https://datasets.wri.org/datasets/dominant-drivers-of-tree-cover-loss-at-1km',
  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  notice: '“Tree cover loss by dominant driver”. WRI/Google DeepMind.',
};

/** Real 1990 and 2025 values (FAO FRA 2025 through Our World in Data), linear in between. */
export const FOREST_FIXTURE: ForestAreaData = {
  startYear: FOREST_START,
  endYear: FOREST_END,
  units: { area: 'hectares', share: '% of land area' },
  dataset: { name: 'Global Forest Resources Assessment', version: '2025-12-05' },
  origin: FAO_ORIGIN,
  entities: [
    forestEntity('OWID_WRL', null, 'World', [4343532500, 4140214500], [33.472633, 31.905802]),
    forestEntity('BRA', 'BR', 'Brazil', [618443260, 486086620], [73.99293, 58.157272]),
    forestEntity('BFA', 'BF', 'Burkina Faso', [8299110, 3236970], [30.333006, 11.831031]),
    forestEntity('CHN', 'CN', 'China', [157140590, 227153000], [16.738077, 24.195559]),
    forestEntity('IRL', 'IE', 'Ireland', [461640, 832850], [6.7011175, 12.089563]),
    forestEntity('NRU', 'NR', 'Nauru', [0, 0], [0, 0]),
    forestEntity('RUS', 'RU', 'Russia', [811641340, 832629950], [49.560223, 50.841824]),
  ],
};

export function forestEntityByCode(code: string): ForestAreaEntity {
  const found = FOREST_FIXTURE.entities.find((entity) => entity.code === code);
  if (!found) {
    throw new Error(`No forest fixture entity ${code}`);
  }
  return found;
}

const LOSS_START = 2001;
const LOSS_END = 2024;

export const DRIVERS: TreeCoverLossDriver[] = [
  { id: 'permanentAgriculture', name: 'Permanent agriculture' },
  { id: 'hardCommodities', name: 'Hard commodities (mining and energy)' },
  { id: 'settlementsInfrastructure', name: 'Settlements and infrastructure' },
  { id: 'shiftingCultivation', name: 'Shifting cultivation' },
  { id: 'logging', name: 'Logging' },
  { id: 'wildfire', name: 'Wildfire' },
  { id: 'otherNaturalDisturbances', name: 'Other natural disturbances' },
];

const YEARS = LOSS_END - LOSS_START + 1;

/** A flat series of whole hectares, optionally with a `null` year (no value, not zero). */
function flat(value: number | null, nullYear?: number): (number | null)[] {
  return Array.from({ length: YEARS }, (_, index) =>
    nullYear !== undefined && LOSS_START + index === nullYear ? null : value,
  );
}

/** World values of 2001 and 2024 are real; the years between are a flat sample. */
const world: TreeCoverLossEntity = {
  code: 'OWID_WRL',
  iso2: null,
  name: 'World',
  permanentAgriculture: flat(6000000),
  hardCommodities: flat(200000),
  settlementsInfrastructure: flat(160000),
  shiftingCultivation: flat(2000000),
  logging: flat(5000000),
  wildfire: flat(8000000),
  otherNaturalDisturbances: flat(300000),
};

/** Shifting cultivation is blank in every year, and wildfire in 2020 only: no loss listed. */
const russia: TreeCoverLossEntity = {
  code: 'RUS',
  iso2: 'RU',
  name: 'Russia',
  permanentAgriculture: flat(3000),
  hardCommodities: flat(40000),
  settlementsInfrastructure: flat(4000),
  shiftingCultivation: flat(null),
  logging: flat(800000),
  wildfire: flat(2000000, 2020),
  otherNaturalDisturbances: flat(45000),
};

/** Every driver is blank in 2024. */
const nauru: TreeCoverLossEntity = {
  code: 'NRU',
  iso2: 'NR',
  name: 'Nauru',
  permanentAgriculture: flat(null, 2024),
  hardCommodities: flat(null, 2024),
  settlementsInfrastructure: flat(null, 2024),
  shiftingCultivation: flat(null, 2024),
  logging: flat(null, 2024),
  wildfire: flat(null, 2024),
  otherNaturalDisturbances: flat(null, 2024),
};

export const TREE_COVER_LOSS_FIXTURE: TreeCoverLossData = {
  startYear: LOSS_START,
  endYear: LOSS_END,
  unit: 'hectares',
  dataset: { name: 'Tree cover loss by dominant driver', version: '2025-08-26' },
  origin: GFW_ORIGIN,
  drivers: DRIVERS,
  entities: [world, russia, nauru],
};

export const DEFORESTATION_META: ApiResponseMeta = {
  source: {
    provider: 'Our World in Data',
    license: 'CC BY 4.0',
    sourceUrl: 'https://ourworldindata.org',
    lastUpdated: '2025-12-05T10:00:00.000Z',
  },
  fetchedAt: '2026-11-26T12:00:00.000Z',
};

export const FOREST_PAYLOAD = { data: FOREST_FIXTURE, meta: DEFORESTATION_META };
export const TREE_COVER_LOSS_PAYLOAD = { data: TREE_COVER_LOSS_FIXTURE, meta: DEFORESTATION_META };

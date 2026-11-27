import {
  DataSourceOrigin,
  ECO_CATEGORIES,
  EcoCategory,
  TreeCoverLossDriver,
  TreeCoverLossDriverId,
} from '@eco-metrics/shared';

export const DEFORESTATION_CATEGORY: EcoCategory = ECO_CATEGORIES.DEFORESTATION;

/** Snapshot keys: one per endpoint, so one section failing never serves the other's data. */
export const FOREST_AREA_SNAPSHOT_KEY = 'deforestation-forest-area';
export const TREE_COVER_LOSS_SNAPSHOT_KEY = 'deforestation-tree-cover-loss';

/**
 * Every chart is requested on its chart tab. `forest-area-km` and
 * `forest-area-as-share-of-land-area` open on their map tab, where OWID ignores
 * `country` and answers with a single year; the tree cover loss chart answers
 * the same either way, and is requested alike so the three behave alike.
 */
export const DEFORESTATION_CHART_TAB = 'chart';

/** Forest area (hectares) by country, from the FAO Global Forest Resources Assessment. */
export const FOREST_AREA_CHART = {
  slug: 'forest-area-km',
  column: '_1a_forestarea',
  /** Indicator whose metadata names the dataset and carries the provider's timestamp. */
  metadataIndicatorId: 1129226,
} as const;

/**
 * Forest area as a share of land area. The chart also holds estimates back to the year 1000
 * from other sources; only 1990 onwards (the FAO series) is ever requested.
 */
export const FOREST_SHARE_CHART = {
  slug: 'forest-area-as-share-of-land-area',
  column: 'forest_share',
  metadataIndicatorId: 1132530,
} as const;

/** First year served and requested: the first FAO reference year. */
export const FOREST_AREA_START_YEAR = 1990;

/** Hectares are whole numbers; the share is a percentage with two decimals. */
export const FOREST_AREA_DECIMALS = 0;
export const FOREST_SHARE_DECIMALS = 2;

export const FOREST_AREA_UNITS = { area: 'hectares', share: '% of land area' } as const;

/** What the provider's indicator metadata must state as unit. */
export const FOREST_AREA_METADATA_UNIT = 'hectares';
export const FOREST_SHARE_METADATA_UNIT = '%';

/**
 * Largest relative spread allowed in the World's implied land area (`area / (share / 100)`)
 * across the served years. The FAO land area is fixed, so a larger spread means the share
 * chart was re-based and must not be served as the same measure.
 */
export const WORLD_LAND_AREA_TOLERANCE = 0.01;

/** Tree cover loss by dominant driver (Global Forest Watch), one download for all columns. */
export const TREE_COVER_LOSS_CHART = {
  slug: 'tree-cover-loss-by-dominant-driver',
  /** Indicator (permanent agriculture) whose metadata names the dataset. */
  metadataIndicatorId: 1104660,
} as const;

/** First year served and requested: the first year of the tree cover loss data. */
export const TREE_COVER_LOSS_START_YEAR = 2001;

/** Loss is detected on 30 m cells (about 0.09 ha): whole hectares are the finest useful grain. */
export const TREE_COVER_LOSS_DECIMALS = 0;
export const TREE_COVER_LOSS_UNIT = 'hectares';

/** A World series shorter than this means the chart answered with a single year. */
export const MIN_WORLD_YEARS = 2;

/**
 * The seven drivers in stacking order (bottom to top), as the source lists them, with the
 * OWID column short name and the source label. Labels are served by the API so the web never
 * hardcodes them. "Hard commodities" is GFW's term, glossed in parentheses.
 */
export const TREE_COVER_LOSS_DRIVERS: readonly (TreeCoverLossDriver & { column: string })[] = [
  {
    id: 'permanentAgriculture',
    name: 'Permanent agriculture',
    column: 'tree_cover_loss_ha__category_permanent_agriculture',
  },
  {
    id: 'hardCommodities',
    name: 'Hard commodities (mining and energy)',
    column: 'tree_cover_loss_ha__category_hard_commodities',
  },
  {
    id: 'settlementsInfrastructure',
    name: 'Settlements and infrastructure',
    column: 'tree_cover_loss_ha__category_settlements__and__infrastructure',
  },
  {
    id: 'shiftingCultivation',
    name: 'Shifting cultivation',
    column: 'tree_cover_loss_ha__category_shifting_cultivation',
  },
  {
    id: 'logging',
    name: 'Logging',
    column: 'tree_cover_loss_ha__category_logging',
  },
  {
    id: 'wildfire',
    name: 'Wildfire',
    column: 'tree_cover_loss_ha__category_wildfire',
  },
  {
    id: 'otherNaturalDisturbances',
    name: 'Other natural disturbances',
    column: 'tree_cover_loss_ha__category_other_natural_disturbances',
  },
];

/** The provider column of every driver. */
export const TREE_COVER_LOSS_COLUMNS = Object.fromEntries(
  TREE_COVER_LOSS_DRIVERS.map(({ id, column }) => [id, column]),
) as Record<TreeCoverLossDriverId, string>;

/**
 * Producer of the forest area values (FAO FRA 2025, licensed CC BY 4.0 under the FAO database
 * terms of use). The credit follows the format those terms prescribe; the access date is left
 * out because a static constant has none. The share chart also holds estimates from other
 * sources before 1990, which this site does not use: the citation says so, since an origin has
 * no description field.
 */
export const FAO_FRA_ORIGIN: DataSourceOrigin = {
  producer: 'Food and Agriculture Organization of the United Nations',
  title: 'Global Forest Resources Assessment 2025',
  url: 'https://www.fao.org/forest-resources-assessment/en',
  license: {
    name: 'CC BY 4.0',
    url: 'https://www.fao.org/contact-us/terms/db-terms-of-use/en',
  },
  notice:
    'FAO. 2025. Global Forest Resources Assessment 2025. ' +
    'https://www.fao.org/forest-resources-assessment/en. Licence: CC-BY-4.0.',
  citation:
    'Food and Agriculture Organization of the United Nations. 2025. Global Forest Resources ' +
    'Assessment 2025. Rome. The republished share-of-land series also holds estimates from other ' +
    'sources before 1990; this site uses only 1990 onwards.',
};

/**
 * Producer of the tree cover loss values (WRI and Google DeepMind, dataset record
 * `wri_google_tree_cover_loss_drivers` of the Global Forest Watch Data API, license CC BY 4.0).
 * The notice is the credit that record asks for when the data are displayed.
 */
export const GFW_DRIVERS_ORIGIN: DataSourceOrigin = {
  producer: 'World Resources Institute and Google DeepMind (Global Forest Watch)',
  title: 'Tree cover loss by dominant driver (Sims et al., 2025)',
  url: 'https://datasets.wri.org/datasets/dominant-drivers-of-tree-cover-loss-at-1km',
  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  notice: '“Tree cover loss by dominant driver”. WRI/Google DeepMind.',
  citation:
    'Sims, M.J., R. Stanimirova, A. Raichuk, M. Neumann, J. Richter, F. Follett, J. MacCarthy, ' +
    'K. Lister, C. Randle, L. Sloat, E. Esipova, J. Jupiter, C. Stanton, D. Morris, C. M. Slay, ' +
    'D. Purves, and N. Harris. 2025. “Global Drivers of Forest Loss at 1 Km Resolution.” ' +
    'Environmental Research Letters 20 (7): 074027. doi:10.1088/1748-9326/add606.',
};

export type { ApiResponse, ApiResponseMeta } from './lib/api-response';
export { ECO_CATEGORIES } from './lib/eco-category';
export type { EcoCategory } from './lib/eco-category';
export type { DataSourceAttribution } from './lib/data-source-attribution';
export type {
  DataSourceOrigin,
  DataSourcePublication,
  DataSourcePublisher,
  DataSourcesCatalog,
  DataSourceTimestampBasis,
  LiveDataSource,
  LiveDataSourceOrigin,
  StaticDataSource,
} from './lib/data-sources';
export type { MetricPoint, MetricSeries } from './lib/metric-series';
export type {
  WaterFootprintCategory,
  WaterFootprintProduct,
  WaterFootprintWaterType,
} from './lib/water-footprint';
export {
  waterFootprintCategorySlugMap,
  waterFootprintWaterTypeLabels,
} from './lib/water-footprint';
export type { Co2EmissionsData, Co2EmissionsEntity, Co2EmissionsMetric } from './lib/co2-emissions';
export {
  ISO3_TO_ISO2,
  KOSOVO_ENTITY_CODE,
  WORLD_ENTITY_CODE,
  iso2ForEntityCode,
  listCountryEntityCodes,
} from './lib/country-codes';
export type { CountryEntity, DatasetIdentity } from './lib/country-series';
export type {
  GlobalTemperatureData,
  GlobalTemperatureEntity,
  GlobalTemperatureGlobal,
} from './lib/global-temperature';

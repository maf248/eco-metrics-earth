import type { DataSourceLicense } from '@eco-metrics/shared';

/** Catalog page of the World Bank dataset. */
export const WASTE_RECYCLING_SOURCE_URL =
  'https://datacatalog.worldbank.org/search/dataset/0039597/What-a-Waste-Global-Database';

export const WASTE_RECYCLING_PROVIDER = 'World Bank';

export const WASTE_RECYCLING_LICENSE: DataSourceLicense = {
  name: 'CC BY 4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/',
};

/** Title of the World Bank publication the dataset comes from. */
export const WASTE_RECYCLING_TITLE =
  'What a Waste 3.0: Global Snapshot of Solid Waste Management Toward Circularity until 2050';

/** The World Bank's suggested citation, as written in the workbook's Info sheet. */
export const WASTE_RECYCLING_CITATION =
  'Cook, Ed, Ionkova, Kremena, Bhada-Tata, Perinaz, Yadav, Sonakshi, and Van Woerden, Frank. 2026. ' +
  'What a Waste 3.0: Global Snapshot of Solid Waste Management Toward Circularity until 2050. ' +
  'Country dataset (Excel). Washington, DC: World Bank Group.';

export const WASTE_RECYCLING_PUBLISHED_YEAR = 2026;

import type {
  DataSourceAttribution,
  DataSourcePublication,
  DataSourcePublisher,
  DataSourcesCatalog,
  DataSourceTimestampBasis,
  LiveDataSource,
  StaticDataSource,
  WaterFootprintProduct,
} from '../../src/index';

const attribution: DataSourceAttribution = {
  provider: 'Example Provider',
  license: 'CC BY 4.0',
  sourceUrl: 'https://provider.example',
  lastUpdated: '2024-01-15T00:00:00.000Z',
};

describe('data sources catalog types', () => {
  it('should accept a LiveDataSource wherever a DataSourceAttribution is expected', () => {
    const live: LiveDataSource = {
      ...attribution,
      id: 'example',
      description: 'Example live provider',
      categories: ['air-quality'],
      lastUpdatedBasis: 'provider',
    };
    const asAttribution: DataSourceAttribution = live;

    expect(asAttribution.provider).toBe('Example Provider');
  });

  it('should accept a full DataSourceAttribution wherever a DataSourcePublisher is expected', () => {
    const publisher: DataSourcePublisher = attribution;

    expect(publisher.license).toBe('CC BY 4.0');
  });

  it('should restrict the timestamp basis to provider or retrieval', () => {
    const bases: DataSourceTimestampBasis[] = ['provider', 'retrieval'];

    expect(bases).toHaveLength(2);
  });

  it('should compose a catalog from live providers and static datasets', () => {
    const publication: DataSourcePublication = {
      citation: 'Author (2018), Journal',
      url: 'https://doi.org/10.0000/example',
      publishedYear: 2018,
      entryCount: 3,
    };
    const dataset: StaticDataSource = {
      id: 'water-footprint',
      name: 'Water footprint',
      description: 'Example static dataset',
      categories: ['water-footprint'],
      publications: [publication],
    };
    const catalog: DataSourcesCatalog = { providers: [], datasets: [dataset] };

    expect(catalog.datasets[0].publications[0].publishedYear).toBe(2018);
  });

  it('should compile a WaterFootprintProduct with and without a publisher', () => {
    const base: WaterFootprintProduct = {
      product: 'Apples',
      category: 'Food & Beverages',
      waterFootprintLiters: 180.1,
      unit: 'per kg',
      waterType: 'blue',
      source: 'Poore & Nemecek (2018), Science',
      sourceUrl: 'https://ourworldindata.org/grapher/example',
    };
    const withPublisher: WaterFootprintProduct = { ...base, publisher: attribution };

    expect(base.publisher).toBeUndefined();
    expect(withPublisher.publisher?.provider).toBe('Example Provider');
  });
});

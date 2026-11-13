import { StaticDataSource } from '@eco-metrics/shared';

import { OWID_PUBLISHER } from '../../src/modules/providers/owid/owid.attribution';
import { WaterFootprintService } from '../../src/modules/water-footprint/water-footprint.service';

describe('WaterFootprintService over the real dataset', () => {
  const service = new WaterFootprintService();
  const products = service.getAllProducts();
  const [contribution] = service.getDataSources();
  const dataset = contribution.source as StaticDataSource;

  it('should derive 15 publications whose entry counts sum to the 60 rows', () => {
    expect(products).toHaveLength(60);
    expect(dataset.publications).toHaveLength(15);
    expect(dataset.publications.reduce((sum, { entryCount }) => sum + entryCount, 0)).toBe(60);
  });

  it('should list Poore & Nemecek once with 37 entries and its publication year', () => {
    const matches = dataset.publications.filter(
      ({ citation }) => citation === 'Poore & Nemecek (2018), Science',
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ entryCount: 37, publishedYear: 2018 });
  });

  it('should leave every water-footprint publication without a license', () => {
    expect(dataset.publications.some((publication) => 'license' in publication)).toBe(false);
  });

  it('should give every publication a numeric year and no dataset-level timestamp', () => {
    expect(dataset).not.toHaveProperty('lastUpdated');
    expect(dataset.publications.every(({ publishedYear }) => Number.isInteger(publishedYear))).toBe(
      true,
    );
  });

  it('should attach the OWID publisher to the 37 OWID rows and to no other', () => {
    const withPublisher = products.filter(({ publisher }) => publisher);

    expect(withPublisher).toHaveLength(37);
    expect(withPublisher.every(({ publisher }) => publisher === OWID_PUBLISHER)).toBe(true);
    expect(
      withPublisher.every(({ sourceUrl }) => new URL(sourceUrl).hostname === 'ourworldindata.org'),
    ).toBe(true);
  });

  it('should attach the OWID publisher to the OWID publication and citation text stays intact', () => {
    const owid = dataset.publications.find(({ publisher }) => publisher);

    expect(owid?.publisher).toEqual({
      provider: 'Our World in Data',
      license: 'CC BY 4.0',
      sourceUrl: 'https://ourworldindata.org',
    });
    expect(owid?.citation).toBe('Poore & Nemecek (2018), Science');
  });
});

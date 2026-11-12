import { render, screen, within } from '@testing-library/react';

import DataSourcesPage, { instant, maxDuration, metadata } from '@/app/data-sources/page';
import { metadata as layoutMetadata } from '@/app/layout';
import { getDataSources } from '@/lib/dataSources';
import { OG_IMAGE } from '@/lib/socialMetadata';
import type { DataSourcesCatalog, LiveDataSource } from '@eco-metrics/shared';

jest.mock('@/lib/dataSources', () => ({ getDataSources: jest.fn() }));

const owid = {
  provider: 'Our World in Data',
  license: 'CC BY 4.0',
  sourceUrl: 'https://ourworldindata.org',
};

const provider: LiveDataSource = {
  id: 'noaa',
  provider: 'NOAA',
  license: 'Public domain',
  sourceUrl: 'https://noaa.example',
  description: 'Temperature anomalies',
  categories: ['global-temperature'],
  lastUpdated: '2024-03-09T23:30:00.000Z',
  lastUpdatedBasis: 'provider',
  origins: [],
};

const datasets: DataSourcesCatalog['datasets'] = [
  {
    id: 'water-footprint',
    name: 'Water footprint of products',
    description: 'Compiled from publications',
    categories: ['water-footprint'],
    publications: [
      {
        citation: 'Poore & Nemecek (2018), Science',
        url: 'https://ourworldindata.org/grapher/x',
        publishedYear: 2018,
        entryCount: 37,
        publisher: owid,
      },
      {
        citation: 'de Vries (2023), Cell Reports Sustainability',
        url: 'https://doi.org/10.1016/j.crsus.2023.100004',
        publishedYear: 2023,
        entryCount: 1,
      },
    ],
  },
];

const wasteDataset: DataSourcesCatalog['datasets'][number] = {
  id: 'waste-recycling',
  name: 'Municipal waste by country',
  description: 'World Bank dataset',
  categories: ['waste-recycling'],
  publications: [
    {
      citation: 'Cook, Ed et al. 2026. What a Waste 3.0',
      url: 'https://datacatalog.worldbank.org/x',
      publishedYear: 2026,
      entryCount: 217,
      license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    },
  ],
};

const datasetsWithLicense = (): DataSourcesCatalog['datasets'] => [datasets[0], wasteDataset];

const renderPage = async (catalog: DataSourcesCatalog) => {
  jest.mocked(getDataSources).mockResolvedValueOnce(catalog);
  render(await DataSourcesPage());
};

jest.mock('next/server', () => ({ connection: jest.fn() }));

describe('DataSourcesPage', () => {
  it('should render both sections when providers and datasets exist', async () => {
    await renderPage({ providers: [provider], datasets });

    expect(screen.getByRole('heading', { level: 1, name: 'Data sources' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Live data providers' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Cited publications' })).toBeInTheDocument();
    expect(screen.getByText(/Live providers are queried at runtime/)).toBeInTheDocument();
  });

  it('should omit the providers section and its intro mention when there are none', async () => {
    await renderPage({ providers: [], datasets });

    expect(screen.queryByText(/Live data providers/)).not.toBeInTheDocument();
    expect(screen.queryByText(/live providers/i)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Cited publications' })).toBeInTheDocument();
  });

  it.each([
    ['provider', 'Last updated by the provider on'],
    ['retrieval', 'Last retrieved by us on'],
  ] as const)('should word a %s-based timestamp accordingly', async (lastUpdatedBasis, wording) => {
    await renderPage({ providers: [{ ...provider, lastUpdatedBasis }], datasets });

    const providers = screen.getByRole('region', { name: 'Live data providers' });
    expect(within(providers).getByText(new RegExp(wording))).toBeInTheDocument();
    expect(within(providers).getByText('Mar 9, 2024')).toHaveAttribute(
      'datetime',
      '2024-03-09T23:30:00.000Z',
    );
    expect(within(providers).getByRole('link', { name: 'NOAA' })).toHaveAttribute(
      'href',
      'https://noaa.example',
    );
    expect(within(providers).getByText('License: Public domain')).toBeInTheDocument();
  });

  it('should show the publication year, entry count and external citation link', async () => {
    await renderPage({ providers: [], datasets });

    const link = screen.getByRole('link', { name: 'Poore & Nemecek (2018), Science' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Published 2018 · 37 entries')).toBeInTheDocument();
    expect(screen.getByText('Published 2023 · 1 entry')).toBeInTheDocument();
  });

  it('should show "Republished by" only for publications with a publisher', async () => {
    await renderPage({ providers: [], datasets });

    expect(screen.getAllByText(/Republished by/)).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Our World in Data' })).toHaveAttribute(
      'href',
      'https://ourworldindata.org',
    );
    expect(screen.getByText(/Republished by/)).toHaveTextContent(
      'Republished by Our World in Data (CC BY 4.0)',
    );
  });

  it('should link categories to their pages with their titles', async () => {
    await renderPage({ providers: [], datasets });

    // next/link strips the trailing slash in jsdom.
    expect(screen.getByRole('link', { name: 'Water Footprint' })).toHaveAttribute(
      'href',
      '/water-footprint',
    );
  });

  it('should not catch a fetch failure', async () => {
    const failure = new Error('Data sources could not be fetched from the BFF');
    jest.mocked(getDataSources).mockRejectedValueOnce(failure);

    await expect(DataSourcesPage()).rejects.toBe(failure);
  });
});

describe('DataSourcesPage — configuration', () => {
  it('should be rendered on demand so the build never calls the BFF', () => {
    expect(instant).toBe(false);
  });

  it('should cover two 10 s fetch attempts', () => {
    expect(maxDuration).toBe(30);
  });

  it('should declare title, description, canonical and social metadata', () => {
    expect(metadata.title).toBe('Data sources');
    expect(metadata.description).toEqual(expect.any(String));
    expect(metadata.description).not.toBe(layoutMetadata.description);
    expect(metadata.alternates?.canonical).toMatch(/\/data-sources\/$/);
    expect(metadata.openGraph).toMatchObject({
      title: 'Data sources',
      url: expect.stringMatching(/\/data-sources\/$/),
      images: [OG_IMAGE],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', title: 'Data sources' });
  });
});

describe('DataSourcesPage upstream origins', () => {
  const withOrigins: LiveDataSource = {
    ...provider,
    origins: [
      {
        producer: 'Copernicus Climate Change Service (C3S)',
        title: 'ERA5 monthly averaged data',
        url: 'https://cds.example/era5',
        license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
        notice: 'Contains modified Copernicus Climate Change Service information',
        citation: 'Hersbach et al. (2023), doi:10.24381/cds.f17050d7',
        categories: ['global-temperature'],
      },
      {
        producer: 'Global Carbon Project',
        title: 'Global Carbon Budget',
        url: 'https://globalcarbonbudget.org/',
        license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
        categories: ['co2-emissions'],
      },
    ],
  };

  it('should list each origin under its provider with linked title and license', async () => {
    await renderPage({ providers: [withOrigins], datasets: [] });

    expect(screen.getByRole('heading', { level: 4, name: 'Data produced by' })).toBeInTheDocument();
    const era5 = screen.getByRole('link', { name: 'ERA5 monthly averaged data' });
    expect(era5).toHaveAttribute('href', 'https://cds.example/era5');
    expect(era5).toHaveAttribute('target', '_blank');
    expect(era5).toHaveAttribute('rel', 'noopener noreferrer');
    const item = era5.closest('li') as HTMLElement;
    expect(within(item).getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
    expect(within(item).getByRole('link', { name: 'Global Temperature' })).toHaveAttribute(
      'href',
      '/global-temperature',
    );
    expect(screen.getByRole('link', { name: 'Global Carbon Budget' })).toBeInTheDocument();
  });

  it('should show the notice and the citation when present', async () => {
    await renderPage({ providers: [withOrigins], datasets: [] });

    expect(
      screen.getByText('Contains modified Copernicus Climate Change Service information'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Hersbach et al\. \(2023\)/)).toBeInTheDocument();
  });

  it('should render no sub-list for a provider without origins', async () => {
    await renderPage({ providers: [provider], datasets: [] });

    expect(screen.queryByText('Data produced by')).not.toBeInTheDocument();
  });
});

describe('DataSourcesPage publication license', () => {
  it('should show the license of a publication as an external link after its entry count', async () => {
    await renderPage({ providers: [], datasets: datasetsWithLicense() });

    const link = screen.getByRole('link', { name: 'CC BY 4.0' });
    expect(link).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.closest('p')).toHaveTextContent('217 entries · License CC BY 4.0');
  });

  it('should show no License text for a publication without a license', async () => {
    await renderPage({ providers: [], datasets: datasetsWithLicense().slice(0, 1) });

    expect(screen.queryByText(/License/)).not.toBeInTheDocument();
  });
});

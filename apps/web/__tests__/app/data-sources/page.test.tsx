import { render, screen, within } from '@testing-library/react';

import DataSourcesPage, { dynamic, maxDuration, metadata } from '@/app/data-sources/page';
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

const renderPage = async (catalog: DataSourcesCatalog) => {
  jest.mocked(getDataSources).mockResolvedValueOnce(catalog);
  render(await DataSourcesPage());
};

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
    expect(dynamic).toBe('force-dynamic');
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

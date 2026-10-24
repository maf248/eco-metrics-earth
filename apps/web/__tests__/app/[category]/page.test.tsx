import { render, screen } from '@testing-library/react';

import CategoryPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
  maxDuration,
  revalidate,
} from '@/app/[category]/page';
import { CATEGORY_DESCRIPTIONS } from '@/lib/categoryMetadata';
import { getDataSources } from '@/lib/dataSources';
import { OG_IMAGE } from '@/lib/socialMetadata';
import { getWaterFootprintProducts } from '@/lib/waterFootprint';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

jest.mock('@/lib/waterFootprint', () => ({
  getWaterFootprintProducts: jest.fn().mockResolvedValue([
    {
      product: 'Apples',
      category: 'Food & Beverages',
      waterFootprintLiters: 180.1,
      unit: 'per kg',
      waterType: 'blue',
      source: 'Poore & Nemecek (2018), Science',
      sourceUrl: 'https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore',
      methodology: 'Freshwater withdrawals per kg of final product.',
    },
  ]),
}));

jest.mock('@/lib/dataSources', () => ({ getDataSources: jest.fn() }));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));

describe('CategoryPage', () => {
  it('should render an h1 heading', async () => {
    const element = await CategoryPage({ params: Promise.resolve({ category: 'ocean-health' }) });
    render(element);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('should display the correct title for ocean-health', async () => {
    const element = await CategoryPage({ params: Promise.resolve({ category: 'ocean-health' }) });
    render(element);
    expect(screen.getByText('Ocean Health')).toBeTruthy();
  });

  it('should display the correct title for co2-emissions', async () => {
    const element = await CategoryPage({ params: Promise.resolve({ category: 'co2-emissions' }) });
    render(element);
    expect(screen.getByText('CO2 Emissions')).toBeTruthy();
  });

  it('should display the correct title for endangered-species', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'endangered-species' }),
    });
    render(element);
    expect(screen.getByText('Endangered Species')).toBeTruthy();
  });

  it('should display the correct title for global-temperature', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'global-temperature' }),
    });
    render(element);
    expect(screen.getByText('Global Temperature')).toBeTruthy();
  });

  it('should display the correct title for deforestation', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'deforestation' }),
    });
    render(element);
    expect(screen.getByText('Deforestation')).toBeTruthy();
  });

  it('should display the correct title for waste-recycling', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'waste-recycling' }),
    });
    render(element);
    expect(screen.getByText('Waste & Recycling')).toBeTruthy();
  });

  it('should display the correct title for reforestation', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'reforestation' }),
    });
    render(element);
    expect(screen.getByText('Reforestation')).toBeTruthy();
  });

  it('should display the correct title for glacier-melting', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'glacier-melting' }),
    });
    render(element);
    expect(screen.getByText('Glacier Melting')).toBeTruthy();
  });

  it('should display the correct title for plastic-pollution', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'plastic-pollution' }),
    });
    render(element);
    expect(screen.getByText('Plastic Pollution')).toBeTruthy();
  });

  it('should display the correct title for energy-sources', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'energy-sources' }),
    });
    render(element);
    expect(screen.getByText('Energy Sources')).toBeTruthy();
  });

  it('should render a <main> element with id="main-content" and tabIndex={-1}', async () => {
    const element = await CategoryPage({ params: Promise.resolve({ category: 'ocean-health' }) });
    const { container } = render(element);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    expect(main?.getAttribute('id')).toBe('main-content');
    expect(main?.getAttribute('tabindex')).toBe('-1');
  });
});

describe('generateMetadata', () => {
  it('should return a title with the human-readable category name', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'ocean-health' }),
    });
    expect(metadata.title).toBe('Ocean Health');
  });

  it('should return the description from the category map', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'air-quality' }),
    });
    expect(metadata.description).toBe(CATEGORY_DESCRIPTIONS['air-quality']);
    expect(metadata.openGraph?.description).toBe(CATEGORY_DESCRIPTIONS['air-quality']);
    expect(metadata.twitter?.description).toBe(CATEGORY_DESCRIPTIONS['air-quality']);
  });

  it('should return the keyword-bearing title and map description for water-footprint', async () => {
    jest.mocked(getWaterFootprintProducts).mockClear();
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'water-footprint' }),
    });
    expect(metadata.title).toBe('Water Footprint of Food & Products');
    expect(metadata.description).toBe(CATEGORY_DESCRIPTIONS['water-footprint']);
    expect(metadata.openGraph?.title).toBe('Water Footprint of Food & Products');
    expect(metadata.openGraph?.description).toBe(CATEGORY_DESCRIPTIONS['water-footprint']);
    expect(metadata.twitter?.title).toBe('Water Footprint of Food & Products');
    expect(metadata.twitter?.description).toBe(CATEGORY_DESCRIPTIONS['water-footprint']);
    expect(getWaterFootprintProducts).not.toHaveBeenCalled();
  });

  it('should handle co2-emissions correctly in metadata', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'co2-emissions' }),
    });
    expect(metadata.title).toBe('CO2 Emissions');
  });

  it('should return the correct title for waste-recycling', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'waste-recycling' }),
    });
    expect(metadata.title).toBe('Waste & Recycling');
  });

  it('should generate metadata for all ECO_CATEGORY slugs without throwing', async () => {
    for (const slug of Object.values(ECO_CATEGORIES)) {
      const metadata = await generateMetadata({
        params: Promise.resolve({ category: slug }),
      });
      expect(typeof metadata.title).toBe('string');
      expect((metadata.title as string).length).toBeGreaterThan(0);
    }
  });

  it('should include a canonical URL with trailing slash for air-quality', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'air-quality' }),
    });
    const canonical = metadata.alternates?.canonical as string;
    expect(canonical).toMatch(/\/air-quality\/$/);
  });

  it('should include openGraph title matching the page title for air-quality', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'air-quality' }),
    });
    expect(metadata.openGraph?.title).toBe('Air Quality');
  });

  it('should include openGraph url matching the canonical URL for air-quality', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'air-quality' }),
    });
    const canonical = metadata.alternates?.canonical as string;
    expect(metadata.openGraph?.url).toBe(canonical);
  });

  it('should keep the shared openGraph fields and social card for air-quality', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'air-quality' }),
    });
    const openGraph = metadata.openGraph as { type?: string; images?: unknown };
    expect(openGraph.type).toBe('website');
    expect(metadata.openGraph?.siteName).toBe('eco-metrics earth');
    expect(openGraph.images).toEqual([OG_IMAGE]);
  });

  it('should use the summary_large_image twitter card for air-quality', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'air-quality' }),
    });
    expect((metadata.twitter as { card?: string }).card).toBe('summary_large_image');
  });
});

describe('notFound behavior', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // notFound() is mocked (doesn't throw), so execution continues into getCategoryIcon
    // for unregistered slugs — silence the expected dev-only warn.
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should call notFound() for an unknown category slug', async () => {
    const { notFound } = jest.requireMock('next/navigation') as {
      notFound: jest.Mock;
    };
    await CategoryPage({ params: Promise.resolve({ category: 'papa' }) });
    expect(notFound).toHaveBeenCalled();
  });

  it('should call notFound() from generateMetadata for an unknown category slug', async () => {
    const { notFound } = jest.requireMock('next/navigation') as {
      notFound: jest.Mock;
    };
    await generateMetadata({ params: Promise.resolve({ category: 'papa' }) });
    expect(notFound).toHaveBeenCalled();
  });
});

describe('generateStaticParams', () => {
  it('should return an array of objects with { category: string } shape', async () => {
    const params = await generateStaticParams();
    expect(Array.isArray(params)).toBe(true);
    params.forEach((param) => {
      expect(typeof param.category).toBe('string');
    });
  });

  it('should return every category except water-footprint', async () => {
    const params = await generateStaticParams();
    expect(params).toHaveLength(Object.keys(ECO_CATEGORIES).length - 1);
    expect(params).not.toContainEqual({ category: ECO_CATEGORIES.WATER_FOOTPRINT });
  });
});

describe('CategoryPage — layout', () => {
  it('should render the <main> with top-anchored layout (justify-start)', async () => {
    const element = await CategoryPage({ params: Promise.resolve({ category: 'ocean-health' }) });
    const { container } = render(element);
    const main = container.querySelector('main');
    expect(main?.className).toContain('justify-start');
    expect(main?.className).not.toContain('justify-center');
  });

  it('should render the <main> with pt-14 top padding', async () => {
    const element = await CategoryPage({ params: Promise.resolve({ category: 'ocean-health' }) });
    const { container } = render(element);
    const main = container.querySelector('main');
    expect(main?.className).toContain('pt-14');
  });
});

describe('CategoryPage snapshots', () => {
  it('should match snapshot for ocean-health', async () => {
    const element = await CategoryPage({ params: Promise.resolve({ category: 'ocean-health' }) });
    const { asFragment } = render(element);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should match snapshot for endangered-species', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'endangered-species' }),
    });
    const { asFragment } = render(element);
    expect(asFragment()).toMatchSnapshot();
  });
});

describe('CategoryPage — water-footprint branch', () => {
  it('should render water-footprint product content from the mocked helper', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'water-footprint' }),
    });
    render(element);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Water Footprint');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Apples').length).toBeGreaterThanOrEqual(1);
  });

  it('should keep the coming-soon placeholder for non-water-footprint categories', async () => {
    const element = await CategoryPage({ params: Promise.resolve({ category: 'ocean-health' }) });
    render(element);

    expect(screen.getByText('Ocean Health metrics — coming soon.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('should propagate a helper failure instead of rendering the page', async () => {
    const failure = new Error('Water footprint data could not be fetched from the BFF');
    jest.mocked(getWaterFootprintProducts).mockRejectedValueOnce(failure);

    await expect(
      CategoryPage({ params: Promise.resolve({ category: 'water-footprint' }) }),
    ).rejects.toBe(failure);
  });

  it('should fetch only the products, never the data sources catalog', async () => {
    await CategoryPage({ params: Promise.resolve({ category: 'water-footprint' }) });

    expect(getDataSources).not.toHaveBeenCalled();
  });

  it('should not call the helper for non-water-footprint categories', async () => {
    jest.mocked(getWaterFootprintProducts).mockClear();

    await CategoryPage({ params: Promise.resolve({ category: 'ocean-health' }) });

    expect(getWaterFootprintProducts).not.toHaveBeenCalled();
  });
});

describe('CategoryPage — segment config', () => {
  it('should export revalidate as 86400', () => {
    expect(revalidate).toBe(86400);
  });

  it('should render unlisted params on demand (dynamicParams = true)', () => {
    expect(dynamicParams).toBe(true);
  });

  it('should export maxDuration as 30 to cover two 10 s fetch attempts', () => {
    expect(maxDuration).toBe(30);
  });
});

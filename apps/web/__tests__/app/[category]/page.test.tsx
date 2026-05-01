import { ECO_CATEGORIES } from '@eco-metrics/shared';
import { render, screen } from '@testing-library/react';

import CategoryPage, { generateMetadata } from '../../../src/app/[category]/page';

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
    expect(screen.getByText('Co2 Emissions')).toBeTruthy();
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

  it('should display the correct title for air-quality', async () => {
    const element = await CategoryPage({ params: Promise.resolve({ category: 'air-quality' }) });
    render(element);
    expect(screen.getByText('Air Quality')).toBeTruthy();
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

  it('should display the correct title for renewable-energy', async () => {
    const element = await CategoryPage({
      params: Promise.resolve({ category: 'renewable-energy' }),
    });
    render(element);
    expect(screen.getByText('Renewable Energy')).toBeTruthy();
  });
});

describe('generateMetadata', () => {
  it('should return a title with the human-readable category name', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'ocean-health' }),
    });
    expect(metadata.title).toBe('Ocean Health');
  });

  it('should return a description referencing the category name', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'air-quality' }),
    });
    expect(metadata.description).toContain('air quality');
  });

  it('should handle co2-emissions correctly in metadata', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'co2-emissions' }),
    });
    expect(metadata.title).toBe('Co2 Emissions');
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
});

describe('notFound behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

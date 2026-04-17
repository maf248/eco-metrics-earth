import { render, screen } from '@testing-library/react';

import CategoryPage, { generateMetadata } from '../../../src/app/[category]/page';

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
});

describe('generateMetadata', () => {
  it('should return a title with the human-readable category name', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: 'ocean-health' }),
    });
    expect(metadata.title).toBe('Ocean Health — eco-metrics earth');
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
    expect(metadata.title).toBe('Co2 Emissions — eco-metrics earth');
  });
});

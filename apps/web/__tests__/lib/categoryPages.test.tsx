import { render, screen } from '@testing-library/react';

import { CATEGORY_PAGES, defineCategoryPage } from '@/lib/categoryPages';

import { ENERGY_FIXTURE, ENERGY_META } from '../fixtures/energySources';
import { TEMPERATURE_FIXTURE, TEMPERATURE_META } from '../fixtures/globalTemperature';

jest.mock('@/lib/waterFootprint', () => ({ getWaterFootprintProducts: jest.fn() }));
jest.mock('@/lib/co2Emissions', () => ({ getCo2Emissions: jest.fn() }));
jest.mock('@/lib/globalTemperature', () => ({ getGlobalTemperature: jest.fn() }));
jest.mock('@/lib/energySources', () => ({ getEnergySources: jest.fn() }));
jest.mock('@/components/charts/LazyPieEChart', () => ({
  LazyPieEChart: () => <div data-testid="pie-stub" />,
}));
jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: () => <div data-testid="chart-stub" />,
}));

describe('CATEGORY_PAGES', () => {
  it('should register exactly water-footprint, co2-emissions, global-temperature and energy-sources', () => {
    expect(Object.keys(CATEGORY_PAGES).sort()).toEqual([
      'co2-emissions',
      'energy-sources',
      'global-temperature',
      'water-footprint',
    ]);
  });

  it('should give every entry a loader and a content component', () => {
    for (const definition of Object.values(CATEGORY_PAGES)) {
      expect(typeof definition.load).toBe('function');
      expect(typeof definition.Content).toBe('function');
    }
  });

  it('should render water-footprint content inside the centered container', () => {
    const Content = CATEGORY_PAGES['water-footprint']?.Content;
    if (!Content) throw new Error('missing entry');

    const { container } = render(<Content data={[]} />);

    expect(container.firstElementChild).toHaveClass('mt-8', 'w-full', 'flex', 'justify-center');
    expect(screen.getByText('No water footprint data is currently available.')).toBeInTheDocument();
  });
});

describe('CATEGORY_PAGES global-temperature entry', () => {
  it('should render the content inside the centered container', () => {
    const Content = CATEGORY_PAGES['global-temperature']?.Content;
    if (!Content) throw new Error('missing entry');

    const { container } = render(
      <Content data={{ data: TEMPERATURE_FIXTURE, meta: TEMPERATURE_META }} />,
    );

    expect(container.firstElementChild).toHaveClass('mt-8', 'w-full', 'flex', 'justify-center');
    expect(screen.getByTestId('global-temperature-key-figures')).toBeInTheDocument();
  });
});

describe('CATEGORY_PAGES energy-sources entry', () => {
  it('should render the content inside the centered container', () => {
    const Content = CATEGORY_PAGES['energy-sources']?.Content;
    if (!Content) throw new Error('missing entry');

    const { container } = render(<Content data={{ data: ENERGY_FIXTURE, meta: ENERGY_META }} />);

    expect(container.firstElementChild).toHaveClass('mt-8', 'w-full', 'flex', 'justify-center');
    expect(screen.getByTestId('energy-key-figures')).toBeInTheDocument();
  });
});

describe('defineCategoryPage', () => {
  it('should return the definition it was given', async () => {
    const definition = defineCategoryPage({
      load: async () => 'data',
      Content: ({ data }) => <p>{data}</p>,
    });

    await expect(definition.load()).resolves.toBe('data');
  });
});

import { render, screen } from '@testing-library/react';

import { CategoryDataSkeleton } from '@/components/CategoryDataSkeleton';
import { ChartSkeleton } from '@/components/charts/ChartSkeleton';

describe('CategoryDataSkeleton', () => {
  it('should render nothing for a category without live data', () => {
    const { container } = render(<CategoryDataSkeleton category="ocean-health" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should hide the shapes from assistive technology', () => {
    render(<CategoryDataSkeleton category="co2-emissions" />);
    expect(screen.getByTestId('category-data-skeleton')).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render one chart skeleton for an explorer', () => {
    render(<CategoryDataSkeleton category="co2-emissions" />);
    expect(screen.getAllByTestId('chart-skeleton')).toHaveLength(1);
  });

  it('should draw its text as bars with the copy hidden', () => {
    render(<CategoryDataSkeleton category="co2-emissions" />);
    expect(screen.getByText('Explore emissions by country')).toHaveClass('text-transparent');
  });

  it('should render a stacked chart and a donut for the energy explorer', () => {
    render(<CategoryDataSkeleton category="energy-sources" />);
    const [series, donut] = screen.getAllByTestId('chart-skeleton');
    expect(series.querySelector('path')).not.toBeNull();
    expect(donut.querySelector('circle')).not.toBeNull();
  });

  it('should render a product list in the wide container, with no chart', () => {
    render(<CategoryDataSkeleton category="water-footprint" />);
    const region = screen.getByTestId('category-data-skeleton');
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
    expect(region.firstElementChild).toHaveClass('max-w-6xl');
  });
});

describe('ChartSkeleton', () => {
  it('should default to the silhouette of a series chart', () => {
    render(<ChartSkeleton />);
    const skeleton = screen.getByTestId('chart-skeleton');
    expect(skeleton.querySelector('path')).not.toBeNull();
    expect(skeleton).toHaveClass('motion-safe:animate-pulse');
  });

  it('should draw a ring for the donut variant', () => {
    render(<ChartSkeleton variant="donut" />);
    expect(screen.getByTestId('chart-skeleton').querySelector('circle')).not.toBeNull();
  });

  it('should keep the map aspect ratio for the map variant', () => {
    render(<ChartSkeleton variant="map" />);
    expect(screen.getByTestId('chart-skeleton')).toHaveClass('aspect-2238/1000');
  });
});

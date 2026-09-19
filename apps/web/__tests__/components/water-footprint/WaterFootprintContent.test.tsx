import '@testing-library/jest-dom';
import type { WaterFootprintProduct } from '@eco-metrics/shared';
import { render, screen } from '@testing-library/react';

import { WaterFootprintContent } from '@/components/water-footprint/WaterFootprintContent';

const product: WaterFootprintProduct = {
  product: 'Apples',
  category: 'Food & Beverages',
  waterFootprintLiters: 180.1,
  unit: 'per kg',
  waterType: 'blue',
  source: 'Poore & Nemecek (2018), Science',
  sourceUrl: 'https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore',
  methodology: 'Freshwater withdrawals per kg of final product.',
};

describe('WaterFootprintContent', () => {
  it('should render an alert notice and no table when fetchFailed is true', () => {
    render(<WaterFootprintContent products={[]} fetchFailed />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Water footprint data is temporarily unavailable. Please try again later.',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should render the empty-state message when there is no data and no fetch failure', () => {
    render(<WaterFootprintContent products={[]} fetchFailed={false} />);

    expect(screen.getByText('No water footprint data is currently available.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('should render the table and footnote when products are provided', () => {
    render(<WaterFootprintContent products={[product]} fetchFailed={false} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Apples').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        /Equivalents are illustrative references: one average shower ≈ 65 L, one full bathtub ≈ 150 L/,
      ),
    ).toBeInTheDocument();
  });
});

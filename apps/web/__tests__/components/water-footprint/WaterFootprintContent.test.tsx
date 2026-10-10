import { render, screen } from '@testing-library/react';

import { WaterFootprintContent } from '@/components/water-footprint/WaterFootprintContent';
import type { WaterFootprintProduct } from '@eco-metrics/shared';

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
  it('should render the empty-state message when the BFF returns no products', () => {
    render(<WaterFootprintContent products={[]} />);

    expect(screen.getByText('No water footprint data is currently available.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should render the table and footnote when products are provided', () => {
    render(<WaterFootprintContent products={[product]} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Apples').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        /Equivalents are illustrative references: one average shower ≈ 65 L, one full bathtub ≈ 150 L/,
      ),
    ).toBeInTheDocument();
  });
});

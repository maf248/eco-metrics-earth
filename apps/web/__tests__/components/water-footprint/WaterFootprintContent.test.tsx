import { render, screen, within } from '@testing-library/react';

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

  describe('source attribution note', () => {
    const publisher = {
      provider: 'Our World in Data',
      license: 'CC BY 4.0',
      sourceUrl: 'https://ourworldindata.org',
    };

    it('should name each distinct publisher once, with its license and a link to the data sources', () => {
      render(
        <WaterFootprintContent
          products={[
            { ...product, publisher },
            { ...product, product: 'Pears', publisher },
          ]}
        />,
      );

      const link = screen.getByRole('link', { name: 'All data sources' });
      expect(link).toHaveAttribute('href', '/data-sources');
      expect(link.parentElement).toHaveTextContent(
        'Some values are republished by Our World in Data (CC BY 4.0). All data sources',
      );
      expect(within(link.parentElement as HTMLElement).getAllByRole('link')).toHaveLength(2);
    });

    it('should show only the data sources link when no product has a publisher', () => {
      render(<WaterFootprintContent products={[product]} />);

      const link = screen.getByRole('link', { name: 'All data sources' });
      expect(link.parentElement).toHaveTextContent(/^All data sources$/);
    });
  });
});

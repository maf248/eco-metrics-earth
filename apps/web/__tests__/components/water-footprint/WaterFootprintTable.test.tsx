import '@testing-library/jest-dom';
import type { WaterFootprintProduct } from '@eco-metrics/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { WaterFootprintTable } from '@/components/water-footprint/WaterFootprintTable';

const fixtures: WaterFootprintProduct[] = [
  {
    product: 'Apples',
    category: 'Food & Beverages',
    waterFootprintLiters: 180.1,
    unit: 'per kg',
    source: 'Poore & Nemecek (2018), Science',
    sourceUrl: 'https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore',
    methodology: 'Freshwater withdrawals per kg of final product.',
  },
  {
    product: 'Cassava',
    category: 'Food & Beverages',
    waterFootprintLiters: null,
    unit: 'per kg',
    source: 'Poore & Nemecek (2018), Science',
    sourceUrl: 'https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore',
    methodology: 'Freshwater withdrawals per kg of final product.',
  },
  {
    product: 'Cotton t-shirt (250g)',
    category: 'Textiles',
    waterFootprintLiters: 2700,
    unit: 'per unit',
    source: 'Water Footprint Network',
    sourceUrl: 'https://waterfootprint.org/en/resources/waterstat/',
    methodology: 'Water footprint of cotton textile products.',
  },
  {
    product: 'Smartphone (1 unit)',
    category: 'Technology',
    waterFootprintLiters: 12760,
    unit: 'per unit',
    source: 'Apple Environmental Report',
    sourceUrl: 'https://www.apple.com/environment/',
    methodology: 'Life-cycle assessment of smartphone manufacturing.',
  },
  {
    product: 'Cement',
    category: 'Manufactured',
    waterFootprintLiters: 5,
    unit: 'per kg',
    source: 'Water Footprint Network',
    sourceUrl: 'https://waterfootprint.org/en/resources/waterstat/',
    methodology: 'Water footprint of cement production.',
  },
];

describe('WaterFootprintTable', () => {
  it('should render rows sorted by water footprint descending by default', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const rows = within(container.querySelector('tbody')!).getAllByRole('rowheader');

    expect(rows[0]).toHaveTextContent('Smartphone (1 unit)');
    expect(rows[1]).toHaveTextContent('Cotton t-shirt (250g)');
    expect(rows[2]).toHaveTextContent('Apples');
    expect(rows[3]).toHaveTextContent('Cement');
    expect(rows[4]).toHaveTextContent('Cassava');
  });

  it('should place null-footprint products last and show "No data"', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const rows = within(container.querySelector('tbody')!).getAllByRole('row');
    const lastRow = rows[rows.length - 1];

    expect(lastRow).toHaveTextContent('Cassava');
    expect(lastRow).toHaveTextContent('No data');
    expect(lastRow).toHaveTextContent('—');
  });

  it('should filter by category and restore All', async () => {
    render(<WaterFootprintTable products={fixtures} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Textiles' }));
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 5');
    expect(screen.getByRole('table')).toHaveTextContent('Cotton t-shirt (250g)');
    expect(screen.getByRole('table')).not.toHaveTextContent('Apples');

    fireEvent.click(screen.getByRole('radio', { name: 'All' }));
    expect(screen.getByRole('status')).toHaveTextContent('Showing 5 of 5');
    expect(screen.getByRole('table')).toHaveTextContent('Apples');
  });

  it('should sort by product name ascending when the Product header is activated', async () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    fireEvent.click(screen.getByRole('button', { name: 'Product' }));

    const rows = within(container.querySelector('tbody')!).getAllByRole('rowheader');
    expect(rows[0]).toHaveTextContent('Apples');
    expect(rows[rows.length - 1]).toHaveTextContent('Smartphone (1 unit)');
  });

  it('should flip the water footprint sort direction when the active header is clicked', async () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    fireEvent.click(screen.getByRole('button', { name: 'Water footprint' }));

    const rows = within(container.querySelector('tbody')!).getAllByRole('rowheader');
    expect(rows[0]).toHaveTextContent('Cement');
    expect(rows[rows.length - 1]).toHaveTextContent('Cassava');
  });

  it('should set aria-sort on the active column only', async () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const headers = container.querySelectorAll('th[scope="col"]');

    const waterHeader = Array.from(headers).find((th) =>
      th.textContent?.includes('Water footprint'),
    );
    expect(waterHeader).toHaveAttribute('aria-sort', 'descending');

    const productHeader = Array.from(headers).find((th) => th.textContent?.includes('Product'));
    expect(productHeader).not.toHaveAttribute('aria-sort');
  });

  it('should update the live region when filter or sort changes', async () => {
    render(<WaterFootprintTable products={fixtures} />);
    const status = screen.getByRole('status');

    expect(status).toHaveTextContent(
      'Showing 5 of 5 products — All categories, sorted by water footprint (high to low)',
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Technology' }));
    expect(status).toHaveTextContent(
      'Showing 1 of 5 products — Technology, sorted by water footprint (high to low)',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Product' }));
    expect(status).toHaveTextContent('Technology, sorted by name (A to Z)');
  });

  it('should expose table semantics including caption, columnheader, rowheader, and scope', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('caption')).toHaveTextContent('Water footprint by product');
    expect(container.querySelectorAll('th[scope="col"]')).toHaveLength(5);
    expect(container.querySelectorAll('th[scope="row"]')).toHaveLength(fixtures.length);
  });

  it('should render a card list with one item per product', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const list = container.querySelector('ul');

    expect(list).toBeInTheDocument();
    expect(list?.querySelectorAll('li')).toHaveLength(fixtures.length);
  });

  it('should show the empty-filter message when the selected filter matches nothing', async () => {
    render(<WaterFootprintTable products={[fixtures[0]]} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Textiles' }));

    expect(screen.getByText('No products match the selected filter.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should match the default render snapshot', () => {
    const { asFragment } = render(<WaterFootprintTable products={fixtures} />);
    expect(asFragment()).toMatchSnapshot();
  });
});

import type { WaterFootprintProduct } from '@eco-metrics/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { WaterFootprintTable } from '@/components/water-footprint/WaterFootprintTable';

const fixtures: WaterFootprintProduct[] = [
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
  {
    product: 'Unmeasured crop (fixture)',
    category: 'Food & Beverages',
    waterFootprintLiters: null,
    unit: 'per kg',
    waterType: 'blue',
    source: 'Poore & Nemecek (2018), Science',
    sourceUrl: 'https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore',
    methodology: 'Freshwater withdrawals per kg of final product.',
  },
  {
    product: 'Cotton t-shirt (250g)',
    category: 'Textiles',
    waterFootprintLiters: 2720,
    unit: 'per unit',
    waterType: 'green-blue-grey',
    source: 'Mekonnen & Hoekstra (2011), Hydrology and Earth System Sciences',
    sourceUrl: 'https://doi.org/10.5194/hess-15-1577-2011',
    methodology: 'Water footprint of cotton textile products.',
  },
  {
    product: 'Microchip (2g)',
    category: 'Technology',
    waterFootprintLiters: 32,
    unit: 'per unit',
    waterType: 'lifecycle-total',
    source: 'Williams, Ayres & Heller (2002), Environ. Sci. Technol.',
    sourceUrl: 'https://doi.org/10.1021/es025643o',
    methodology: 'Life-cycle water consumption of a 2 g microchip.',
  },
  {
    product: 'Portland cement (CEM I)',
    category: 'Manufactured',
    waterFootprintLiters: 2.6,
    unit: 'per kg',
    waterType: 'blue',
    source: 'Gerbens-Leenes, Hoekstra & Bosman (2018), Water Resources and Industry',
    sourceUrl: 'https://doi.org/10.1016/j.wri.2017.11.002',
    methodology: 'Blue water footprint of ordinary Portland cement.',
  },
  {
    product: 'AI text prompt (Gemini, median)',
    category: 'Digital & Computing',
    waterFootprintLiters: 0.00026,
    unit: 'per prompt',
    waterType: 'lifecycle-onsite',
    source: 'Google (2025), Measuring the environmental impact of delivering AI at Google Scale',
    sourceUrl: 'https://arxiv.org/abs/2508.15734',
    methodology: 'On-site data-centre water consumption per median text prompt.',
  },
];

const FILTER_OPTIONS = [
  'All',
  'Food & Beverages',
  'Textiles',
  'Technology',
  'Manufactured',
  'Digital & Computing',
  'Vehicles',
  'Energy & Extractives',
];

describe('WaterFootprintTable', () => {
  it('should render rows sorted by water footprint descending by default', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const rows = within(container.querySelector('tbody')!).getAllByRole('rowheader');

    expect(rows[0]).toHaveTextContent('Cotton t-shirt (250g)');
    expect(rows[1]).toHaveTextContent('Apples');
    expect(rows[2]).toHaveTextContent('Microchip (2g)');
    expect(rows[3]).toHaveTextContent('Portland cement (CEM I)');
    expect(rows[4]).toHaveTextContent('AI text prompt (Gemini, median)');
    expect(rows[5]).toHaveTextContent('Unmeasured crop (fixture)');
  });

  it('should place null-footprint products last and show "No data"', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const rows = within(container.querySelector('tbody')!).getAllByRole('row');
    const lastRow = rows[rows.length - 1];

    expect(lastRow).toHaveTextContent('Unmeasured crop (fixture)');
    expect(lastRow).toHaveTextContent('No data');
    expect(lastRow).toHaveTextContent('—');
  });

  it('should render a readable sub-litre footprint instead of collapsing it to zero', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const row = within(container.querySelector('tbody')!)
      .getAllByRole('row')
      .find((candidate) => candidate.textContent?.includes('AI text prompt'));

    expect(row).toHaveTextContent('0.00026 L');
    expect(row).not.toHaveTextContent('0 L per prompt');
  });

  it('should render the water type label for every product', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const body = within(container.querySelector('tbody')!);

    expect(body.getAllByRole('row')).toHaveLength(fixtures.length);
    expect(container.querySelector('tbody')).toHaveTextContent('Blue water');
    expect(container.querySelector('tbody')).toHaveTextContent('Green + blue + grey');
    expect(container.querySelector('tbody')).toHaveTextContent('Life cycle (on-site)');
    expect(container.querySelector('tbody')).toHaveTextContent('Life cycle (total)');
  });

  it('should not expose a sort control on the water type column', () => {
    render(<WaterFootprintTable products={fixtures} />);

    expect(screen.getByRole('button', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Water footprint' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Water type' })).not.toBeInTheDocument();
  });

  it('should filter by category and restore All', async () => {
    render(<WaterFootprintTable products={fixtures} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Textiles' }));
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 6');
    expect(screen.getByRole('table')).toHaveTextContent('Cotton t-shirt (250g)');
    expect(screen.getByRole('table')).not.toHaveTextContent('Apples');

    fireEvent.click(screen.getByRole('radio', { name: 'All' }));
    expect(screen.getByRole('status')).toHaveTextContent('Showing 6 of 6');
    expect(screen.getByRole('table')).toHaveTextContent('Apples');
  });

  it('should filter by the Digital & Computing category', () => {
    render(<WaterFootprintTable products={fixtures} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Digital & Computing' }));

    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 6');
    expect(screen.getByRole('table')).toHaveTextContent('AI text prompt (Gemini, median)');
    expect(screen.getByRole('table')).not.toHaveTextContent('Apples');
  });

  it('should sort by product name ascending when the Product header is activated', async () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    fireEvent.click(screen.getByRole('button', { name: 'Product' }));

    const rows = within(container.querySelector('tbody')!).getAllByRole('rowheader');
    expect(rows[0]).toHaveTextContent('AI text prompt (Gemini, median)');
    expect(rows[rows.length - 1]).toHaveTextContent('Unmeasured crop (fixture)');
  });

  it('should flip the water footprint sort direction when the active header is clicked', async () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    fireEvent.click(screen.getByRole('button', { name: 'Water footprint' }));

    const rows = within(container.querySelector('tbody')!).getAllByRole('rowheader');
    expect(rows[0]).toHaveTextContent('AI text prompt (Gemini, median)');
    expect(rows[rows.length - 1]).toHaveTextContent('Unmeasured crop (fixture)');
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

    const typeHeader = Array.from(headers).find((th) => th.textContent === 'Water type');
    expect(typeHeader).not.toHaveAttribute('aria-sort');
  });

  it('should update the live region when filter or sort changes', async () => {
    render(<WaterFootprintTable products={fixtures} />);
    const status = screen.getByRole('status');

    expect(status).toHaveTextContent(
      'Showing 6 of 6 products — All categories, sorted by water footprint (high to low)',
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Technology' }));
    expect(status).toHaveTextContent(
      'Showing 1 of 6 products — Technology, sorted by water footprint (high to low)',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Product' }));
    expect(status).toHaveTextContent('Technology, sorted by name (A to Z)');
  });

  it('should expose table semantics including caption, columnheader, rowheader, and scope', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('caption')).toHaveTextContent('Water footprint by product');
    expect(container.querySelectorAll('th[scope="col"]')).toHaveLength(6);
    expect(container.querySelectorAll('th[scope="row"]')).toHaveLength(fixtures.length);
  });

  it('should render a card list with one item per product', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const list = container.querySelector('ul');

    expect(list).toBeInTheDocument();
    expect(list?.querySelectorAll('li')).toHaveLength(fixtures.length);
  });

  it('should render the water type on every card', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const cards = Array.from(container.querySelectorAll('ul li'));
    const aiCard = cards.find((card) => card.textContent?.includes('AI text prompt'));

    expect(cards).toHaveLength(fixtures.length);
    expect(aiCard).toHaveTextContent('Life cycle (on-site)');
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

  it('should isolate each filter radio and label in a wrapper containing only that pair', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);
    const labels = container.querySelectorAll('fieldset label');

    expect(labels).toHaveLength(FILTER_OPTIONS.length);

    labels.forEach((label) => {
      const wrapper = label.parentElement;
      const inputId = label.getAttribute('for');
      const inputs = wrapper?.querySelectorAll('input[type="radio"]');

      expect(wrapper?.tagName.toLowerCase()).toBe('div');
      expect(inputs).toHaveLength(1);
      expect(inputs?.[0].id).toBe(inputId);
      expect(wrapper?.children.length).toBe(2);
    });
  });

  it('should keep exactly one radio checked when activating each filter option', () => {
    const { container } = render(<WaterFootprintTable products={fixtures} />);

    FILTER_OPTIONS.forEach((name) => {
      fireEvent.click(screen.getByRole('radio', { name }));

      expect(screen.getByRole('radio', { name })).toBeChecked();
      expect(container.querySelectorAll('input[type="radio"]:checked')).toHaveLength(1);
    });
  });
});

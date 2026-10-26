import { render, screen, within } from '@testing-library/react';

import { YearDataTable } from '@/components/YearDataTable';

const columns = [
  { header: 'First', values: [1, null, 3], format: (value: number) => `#${value}` },
  { header: 'Second', values: [-1, -2, null], format: (value: number) => `${value} u` },
];

function renderTable() {
  return render(
    <YearDataTable
      caption="Argentina: things, 1950–1952"
      entityName="Argentina"
      startYear={1950}
      endYear={1952}
      columns={columns}
    />,
  );
}

describe('YearDataTable', () => {
  it('should be collapsed by default with the data table summary', () => {
    const { container } = renderTable();

    expect(container.querySelector('details')).not.toHaveAttribute('open');
    expect(screen.getByText('View data table')).toBeInTheDocument();
  });

  it('should label a focusable scroll region with the entity name', () => {
    renderTable();

    const region = screen.getByRole('region', { hidden: true, name: /Data table for Argentina/ });
    expect(region).toHaveAttribute('aria-label', 'Data table for Argentina, scrollable');
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('should render the caption and one column header per definition after Year', () => {
    renderTable();

    expect(screen.getByText('Argentina: things, 1950–1952')).toBeInTheDocument();
    const headers = screen
      .getAllByRole('columnheader', { hidden: true })
      .map((header) => [header.textContent, header.getAttribute('scope')]);
    expect(headers).toEqual([
      ['Year', 'col'],
      ['First', 'col'],
      ['Second', 'col'],
    ]);
  });

  it('should list years newest first and format each cell with its column', () => {
    renderTable();

    const rows = screen.getAllByRole('row', { hidden: true }).slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(['1952#3—', '1951—-2 u', '1950#1-1 u']);
    expect(within(rows[0]).getByRole('rowheader', { hidden: true })).toHaveAttribute(
      'scope',
      'row',
    );
  });

  it('should show an em dash where a value is null', () => {
    renderTable();

    const cells = screen.getAllByRole('cell', { hidden: true });
    expect(cells.filter((cell) => cell.textContent === '—')).toHaveLength(2);
  });
});

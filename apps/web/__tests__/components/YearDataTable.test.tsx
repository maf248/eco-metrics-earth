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

  describe('wide', () => {
    const eight = Array.from({ length: 8 }, (_, index) => ({
      header: `Source ${index + 1} (%)`,
      values: [index, null, index],
      format: (value: number) => `${value}%`,
    }));

    function renderWide(wide?: boolean) {
      return render(
        <YearDataTable
          caption="World: sources"
          entityName="World"
          startYear={2000}
          endYear={2002}
          columns={eight}
          wide={wide}
        />,
      );
    }

    it('should use a larger minimum width than the default table', () => {
      const wide = renderWide(true).container.querySelector('table');
      const regular = renderWide().container.querySelector('table');

      expect(wide).toHaveClass('min-w-3xl');
      expect(wide).not.toHaveClass('min-w-72');
      expect(regular).toHaveClass('min-w-72');
      expect(regular).not.toHaveClass('min-w-3xl');
    });

    it('should cap the width of the header text so a long header wraps', () => {
      renderWide(true);
      const header = screen.getByRole('columnheader', { hidden: true, name: 'Source 1 (%)' });

      expect(header.querySelector('span')).toHaveClass('max-w-32');
    });

    it('should keep the collapsed, labelled and focusable behavior with nine headers', () => {
      const { container } = renderWide(true);

      expect(container.querySelector('details')).not.toHaveAttribute('open');
      const region = screen.getByRole('region', { hidden: true, name: /Data table for World/ });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(screen.getAllByRole('columnheader', { hidden: true })).toHaveLength(9);
    });

    it('should keep newest-first rows and em dashes', () => {
      renderWide(true);

      const rows = screen.getAllByRole('row', { hidden: true });
      expect(within(rows[1]).getByRole('rowheader', { hidden: true })).toHaveTextContent('2002');
      expect(within(rows[2]).getAllByText('—')).toHaveLength(8);
    });

    it('should leave the default markup identical to the markup without the flag', () => {
      const withoutFlag = renderWide().container.innerHTML;
      const explicitFalse = renderWide(false).container.innerHTML;

      expect(explicitFalse).toBe(withoutFlag);
    });
  });
});

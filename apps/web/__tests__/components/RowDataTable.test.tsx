import { render, screen, within } from '@testing-library/react';

import { RowDataTable } from '@/components/RowDataTable';

interface Row {
  date: string;
  value: number | null;
  mission: string;
}

const ROWS: Row[] = [
  { date: '2025-02-03', value: 3.5, mission: 'Sentinel' },
  { date: '2025-01-03', value: null, mission: 'Jason' },
  { date: '2024-12-03', value: -1, mission: 'Jason' },
];

const COLUMNS = [
  { header: 'Value', format: (row: Row) => (row.value === null ? null : `${row.value} mm`) },
  { header: 'Mission', format: (row: Row) => row.mission },
];

function renderTable(note?: string) {
  return render(
    <RowDataTable
      caption="Global mean sea level, all observations"
      entityName="global mean sea level"
      rowHeaderLabel="Date"
      rowHeader={(row) => row.date}
      rowKey={(row) => `${row.date}-${row.mission}`}
      rows={ROWS}
      columns={COLUMNS}
      note={note}
    />,
  );
}

describe('RowDataTable', () => {
  it('should be collapsed by default under the data table summary', () => {
    const { container } = renderTable();

    expect(container.querySelector('details')).not.toHaveAttribute('open');
    expect(screen.getByText('View data table')).toBeInTheDocument();
  });

  it('should name a keyboard-focusable scroll region', () => {
    renderTable();

    const region = screen.getByRole('region', {
      hidden: true,
      name: 'Data table for global mean sea level, scrollable',
    });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('should render the caption and the column headers after the row header', () => {
    renderTable();

    expect(screen.getByText('Global mean sea level, all observations')).toBeInTheDocument();
    const headers = screen
      .getAllByRole('columnheader', { hidden: true })
      .map((header) => [header.textContent, header.getAttribute('scope')]);
    expect(headers).toEqual([
      ['Date', 'col'],
      ['Value', 'col'],
      ['Mission', 'col'],
    ]);
  });

  it('should list the rows in the order given with the date as row header', () => {
    renderTable();

    const rows = screen.getAllByRole('row', { hidden: true }).slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      '2025-02-033.5 mmSentinel',
      '2025-01-03—Jason',
      '2024-12-03-1 mmJason',
    ]);
    expect(within(rows[0]).getByRole('rowheader', { hidden: true })).toHaveAttribute(
      'scope',
      'row',
    );
  });

  it('should show an em dash for a null cell, never zero', () => {
    renderTable();

    const [, nullRow] = screen.getAllByRole('row', { hidden: true }).slice(1);
    expect(within(nullRow).getAllByRole('cell', { hidden: true })[0]).toHaveTextContent('—');
  });

  it('should show the note only when given', () => {
    const { unmount } = renderTable('Showing the most recent 90 days');
    expect(screen.getByText('Showing the most recent 90 days')).toBeInTheDocument();
    unmount();

    renderTable();
    expect(screen.queryByText(/Showing the most recent/)).not.toBeInTheDocument();
  });
});

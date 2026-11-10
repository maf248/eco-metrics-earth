import { fireEvent, render, screen, within } from '@testing-library/react';

import { Co2RankingTable } from '@/components/co2-emissions/Co2RankingTable';
import { DEFAULT_RANKING_SORT, rankCo2Countries, type RankingSort } from '@/lib/co2Ranking';

import { CO2_FIXTURE } from '../../fixtures/co2Emissions';

const region = () => screen.getByTestId('co2-ranking-region');

function renderTable(
  year: number,
  sort: RankingSort = DEFAULT_RANKING_SORT,
  selectedCode: string | null = null,
) {
  const onSortChange = jest.fn();
  render(
    <Co2RankingTable
      rows={rankCo2Countries(CO2_FIXTURE, year, sort)}
      year={year}
      sort={sort}
      onSortChange={onSortChange}
      selectedCode={selectedCode}
      onSelect={jest.fn()}
    />,
  );
  return onSortChange;
}

describe('Co2RankingTable', () => {
  it('should collapse under "View data table" like the other data tables', () => {
    renderTable(2024);
    const summary = screen.getByText('View data table');
    const details = summary.closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details).toContainElement(region());
  });

  it('should be a focusable, named scroll region with a captioned table', () => {
    renderTable(2024);
    expect(region()).toHaveAttribute('tabindex', '0');
    expect(region()).toHaveAccessibleName(
      'Countries ranked by CO2 emissions per capita in 2024, scrollable',
    );
    expect(within(region()).getByRole('table')).toHaveAccessibleName(
      'Countries ranked by CO2 emissions per capita, 2024',
    );
  });

  it('should name the measure sorted by in the caption', () => {
    renderTable(2024, { key: 'total', order: 'descending' });
    expect(within(region()).getByRole('table')).toHaveAccessibleName(
      'Countries ranked by total CO2 emissions, 2024',
    );
  });

  it('should reverse the active column and say both orders in its name', () => {
    const onSortChange = renderTable(2024);
    const perCapita = screen.getByRole('button', { name: /^Per capita/ });
    expect(perCapita).toHaveAccessibleName(
      /^Per capita\s*t\/person\s*, highest first\. Sort lowest first$/,
    );
    expect(perCapita.closest('th')).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(perCapita);
    expect(onSortChange).toHaveBeenCalledWith({ key: 'perCapita', order: 'ascending' });
  });

  it('should sort by the other column, highest first, from its header', () => {
    const onSortChange = renderTable(2024);
    const total = screen.getByRole('button', { name: /^Total/ });
    expect(total).toHaveAccessibleName(/^Total\s*Mt\s*\. Sort highest first$/);
    expect(total.closest('th')).not.toHaveAttribute('aria-sort');

    fireEvent.click(total);
    expect(onSortChange).toHaveBeenCalledWith({ key: 'total', order: 'descending' });
  });

  it('should show the flag, rank, per-capita value and total of each country', () => {
    renderTable(2024);
    const row = screen.getByRole('button', { name: 'Argentina' }).closest('tr') as HTMLElement;
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(row).toHaveTextContent('3.85');
    expect(row).toHaveTextContent('178');
    expect(row.querySelector('[class*="fi"], [aria-hidden="true"]')).not.toBeNull();
  });

  it('should mark the selected country as pressed and current', () => {
    renderTable(2024, DEFAULT_RANKING_SORT, 'USA');
    const button = screen.getByRole('button', { name: 'United States' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.closest('tr')).toHaveAttribute('aria-current', 'true');
  });

  it('should print a dash for a missing total and leave its rank empty when sorting by total', () => {
    render(
      <Co2RankingTable
        rows={[{ rank: null, entity: CO2_FIXTURE.entities[1], perCapita: 3.7, total: null }]}
        year={2022}
        sort={{ key: 'total', order: 'descending' }}
        onSortChange={jest.fn()}
        selectedCode={null}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});

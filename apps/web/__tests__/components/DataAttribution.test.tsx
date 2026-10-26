import { render, screen } from '@testing-library/react';

import { DataAttribution } from '@/components/DataAttribution';

import { CO2_META } from '../fixtures/co2Emissions';

describe('DataAttribution', () => {
  it('should credit the publisher, license and update date, without the dataset version', () => {
    render(<DataAttribution testId="attr" meta={CO2_META} />);

    const paragraph = screen.getByTestId('attr');
    expect(paragraph).toHaveTextContent(/^Data: Our World in Data \(CC BY 4\.0\), updated /);
    expect(screen.getByRole('link', { name: 'Our World in Data' })).toHaveAttribute(
      'href',
      'https://ourworldindata.org',
    );
    expect(paragraph).not.toHaveTextContent('version');
    const time = paragraph.querySelector('time');
    expect(time).toHaveAttribute('dateTime', CO2_META.source.lastUpdated);
    expect(time?.textContent).not.toBe('');
  });

  it('should link to the data sources page exactly once', () => {
    render(<DataAttribution testId="attr" meta={CO2_META} />);

    const links = screen.getAllByRole('link', { name: 'All data sources' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/data-sources');
  });

  it('should render the extra credit before the data sources link', () => {
    render(
      <DataAttribution
        testId="attr"
        meta={CO2_META}
        extra={<span data-testid="extra">Upstream credit.</span>}
      />,
    );

    const extra = screen.getByTestId('extra');
    const link = screen.getByRole('link', { name: 'All data sources' });
    expect(screen.getByTestId('attr')).toContainElement(extra);
    expect(extra.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

import { render, screen } from '@testing-library/react';

import { OriginCredit } from '@/components/OriginCredit';
import type { DataSourceOrigin } from '@eco-metrics/shared';

const minimal: DataSourceOrigin = {
  producer: 'Global Carbon Project',
  title: 'Global Carbon Budget',
  url: 'https://globalcarbonbudget.org/',
  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
};

describe('OriginCredit', () => {
  it('should show the producer, the linked title and the linked license', () => {
    render(<OriginCredit origin={minimal} testId="credit" />);

    const credit = screen.getByTestId('credit');
    expect(credit).toHaveTextContent('Global Carbon Project: Global Carbon Budget (CC BY 4.0).');
    expect(screen.getByRole('link', { name: 'Global Carbon Budget' })).toHaveAttribute(
      'href',
      'https://globalcarbonbudget.org/',
    );
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
  });

  it('should show only those parts for a minimal origin', () => {
    render(<OriginCredit origin={minimal} testId="credit" />);

    expect(screen.getByTestId('credit').textContent).toBe(
      'Global Carbon Project: Global Carbon Budget (CC BY 4.0).',
    );
  });

  it('should add the notice and the disclaimer but not the citation', () => {
    render(
      <OriginCredit
        origin={{
          ...minimal,
          notice: 'Contains modified information (2026)',
          citation: 'Doe et al. (2021), doi:10.1/x.',
          disclaimer: 'Nobody is responsible',
        }}
        testId="credit"
      />,
    );

    expect(screen.getByTestId('credit')).toHaveTextContent(
      'Contains modified information (2026). Nobody is responsible.',
    );
    expect(screen.getByTestId('credit')).not.toHaveTextContent('Doe et al.');
  });

  it('should open both links safely in a new tab', () => {
    render(<OriginCredit origin={minimal} />);

    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
});

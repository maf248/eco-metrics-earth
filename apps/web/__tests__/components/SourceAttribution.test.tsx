import { render, screen } from '@testing-library/react';

import { SourceAttribution } from '@/components/SourceAttribution';
import type { DataSourceAttribution } from '@eco-metrics/shared';

const publisher = {
  provider: 'Our World in Data',
  license: 'CC BY 4.0',
  sourceUrl: 'https://ourworldindata.org',
};

describe('SourceAttribution', () => {
  it('should render the provider as an external link followed by the license', () => {
    const { container } = render(<SourceAttribution source={publisher} />);

    const link = screen.getByRole('link', { name: 'Our World in Data' });
    expect(link).toHaveAttribute('href', 'https://ourworldindata.org');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(container).toHaveTextContent(/^Our World in Data \(CC BY 4\.0\)$/);
  });

  it('should accept a full DataSourceAttribution without rendering its date', () => {
    const attribution: DataSourceAttribution = {
      ...publisher,
      lastUpdated: '2024-01-15T00:00:00.000Z',
    };
    const { container } = render(<SourceAttribution source={attribution} />);

    expect(container.querySelector('time')).toBeNull();
    expect(container).toHaveTextContent(/^Our World in Data \(CC BY 4\.0\)$/);
  });

  it('should use the project focus ring on the link', () => {
    render(<SourceAttribution source={publisher} />);

    expect(screen.getByRole('link')).toHaveClass('underline', 'focus-visible:ring-focus-ring');
  });
});

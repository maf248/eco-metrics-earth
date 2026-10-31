import { render, screen } from '@testing-library/react';

import { DataUnavailable } from '@/components/DataUnavailable';
import { WarningIcon } from '@/components/icons';
import { ProviderBackedContent } from '@/components/ProviderBackedContent';
import { StaleDataNotice } from '@/components/StaleDataNotice';
import type { ApiResponseMeta } from '@eco-metrics/shared';

const META: ApiResponseMeta = {
  source: {
    provider: 'Our World in Data',
    license: 'CC BY 4.0',
    sourceUrl: 'https://ourworldindata.org',
    lastUpdated: '2026-10-13T08:42:32.000Z',
  },
  fetchedAt: '2026-10-20T10:00:00.000Z',
  stale: true,
};

describe('StaleDataNotice', () => {
  it('should read "{Provider} is currently unreachable. Showing the copy we retrieved on {date}."', () => {
    render(<StaleDataNotice providerName="Our World in Data" fetchedAt="2026-10-20T10:00:00Z" />);

    expect(screen.getByTestId('stale-data-notice')).toHaveTextContent(
      'Our World in Data is currently unreachable. Showing the copy we retrieved on Oct 20, 2026.',
    );
  });

  it('should be a status region with the ISO date in a time element', () => {
    const { container } = render(
      <StaleDataNotice providerName="Our World in Data" fetchedAt="2026-10-20T10:00:00Z" />,
    );

    expect(screen.getByRole('status')).toBe(screen.getByTestId('stale-data-notice'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-10-20T10:00:00Z');
  });

  it('should have no button or link and a decorative icon', () => {
    const { container } = render(
      <StaleDataNotice providerName="Our World in Data" fetchedAt="2026-10-20T10:00:00Z" />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('DataUnavailable', () => {
  it('should show the title and body without a last-update line when no date is known', () => {
    render(<DataUnavailable providerName="Our World in Data" />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Data temporarily unavailable',
    );
    expect(screen.getByTestId('data-unavailable')).toHaveTextContent(
      "We couldn't reach Our World in Data to load this data. We're keeping an eye on it and it should be back soon.",
    );
    expect(screen.queryByText(/Last retrieved from/)).not.toBeInTheDocument();
  });

  it('should add the last successful update line when a date is known', () => {
    const { container } = render(
      <DataUnavailable providerName="Our World in Data" lastRetrievedAt="2026-10-01T00:00:00Z" />,
    );

    expect(screen.getByTestId('data-unavailable')).toHaveTextContent(
      'Last retrieved from Our World in Data: Oct 1, 2026',
    );
    expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-10-01T00:00:00Z');
  });

  it('should draw a decorative warning icon in warning-fg, not an error color', () => {
    const { container } = render(<DataUnavailable providerName="Our World in Data" />);

    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveClass('text-warning-fg');
    expect(container.innerHTML).not.toMatch(/text-red-|bg-red-|text-error|text-danger/);
  });

  it('should be a status region, never an alert, with no button', () => {
    render(<DataUnavailable providerName="Our World in Data" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('WarningIcon', () => {
  it('should be hidden from assistive tech without a title', () => {
    const { container } = render(<WarningIcon />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('should expose its title when one is given', () => {
    const { container } = render(<WarningIcon title="Warning" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-labelledby', 'warning-icon-title');
    expect(container.querySelector('title')).toHaveTextContent('Warning');
  });
});

describe('ProviderBackedContent', () => {
  const payload = { meta: META };
  const Content = () => <p data-testid="category-content">content</p>;

  it('should render only the content for fresh data', () => {
    render(<ProviderBackedContent state={{ kind: 'fresh', payload }} Content={Content} />);

    expect(screen.getByTestId('category-content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('should render the notice and the content for a stale notice', () => {
    render(
      <ProviderBackedContent
        state={{
          kind: 'stale-notice',
          payload,
          providerName: 'Our World in Data',
          fetchedAt: META.fetchedAt,
        }}
        Content={Content}
      />,
    );

    expect(screen.getByTestId('stale-data-notice')).toBeInTheDocument();
    expect(screen.getByTestId('category-content')).toBeInTheDocument();
  });

  it('should replace the content with the unavailable state and keep the source credit', () => {
    render(
      <ProviderBackedContent
        state={{
          kind: 'unavailable',
          providerName: 'Our World in Data',
          payload,
          fetchedAt: META.fetchedAt,
        }}
        Content={Content}
      />,
    );

    expect(screen.queryByTestId('category-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('data-unavailable')).toHaveTextContent(
      'Last retrieved from Our World in Data: Oct 20, 2026',
    );
    expect(screen.getByTestId('unavailable-data-attribution')).toHaveTextContent(
      'Our World in Data',
    );
  });

  it('should show no source credit when no meta is known', () => {
    render(
      <ProviderBackedContent
        state={{ kind: 'unavailable', providerName: 'Our World in Data' }}
        Content={Content}
      />,
    );

    expect(screen.getByTestId('data-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('unavailable-data-attribution')).not.toBeInTheDocument();
  });
});

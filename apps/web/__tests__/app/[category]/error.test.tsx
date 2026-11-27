import * as Sentry from '@sentry/nextjs';
import { fireEvent, render, screen } from '@testing-library/react';
import { useParams } from 'next/navigation';

import CategoryError from '@/app/[category]/error';

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('next/navigation', () => ({ useParams: jest.fn() }));

const captureException = Sentry.captureException as jest.Mock;

describe('CategoryError', () => {
  const retry = jest.fn();
  const error = new Error('BFF down');

  beforeEach(() => {
    retry.mockClear();
    captureException.mockClear();
    jest.mocked(useParams).mockReturnValue({ category: 'co2-emissions' });
  });

  it('should keep the category header', () => {
    render(<CategoryError error={error} retry={retry} />);

    expect(screen.getByRole('heading', { level: 1, name: 'CO2 Emissions' })).toBeInTheDocument();
  });

  it('should show the data unavailable warning, not the generic error', () => {
    render(<CategoryError error={error} retry={retry} />);

    expect(screen.getByTestId('data-unavailable')).toHaveTextContent(
      "We couldn't load this data right now.",
    );
    expect(screen.queryByText('Oops! Something went wrong…')).not.toBeInTheDocument();
  });

  it('should re-fetch the page from the Try again button', () => {
    render(<CategoryError error={error} retry={retry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('should report an error without a digest', () => {
    render(<CategoryError error={error} retry={retry} />);

    expect(captureException).toHaveBeenCalledWith(error);
  });

  it('should not report an error the server already reported', () => {
    render(
      <CategoryError error={Object.assign(new Error('x'), { digest: 'abc' })} retry={retry} />,
    );

    expect(captureException).not.toHaveBeenCalled();
  });

  it('should render only the warning when the slug is not a category', () => {
    jest.mocked(useParams).mockReturnValue({ category: 'unknown' });
    render(<CategoryError error={error} retry={retry} />);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByTestId('data-unavailable')).toBeInTheDocument();
  });
});

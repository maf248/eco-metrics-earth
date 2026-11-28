import * as Sentry from '@sentry/nextjs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useParams } from 'next/navigation';

import CategoryError from '@/app/[category]/error';

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('next/navigation', () => ({ useParams: jest.fn() }));

const captureException = Sentry.captureException as jest.Mock;

describe('CategoryError', () => {
  const retry = jest.fn();
  const error = new Error('Rendering failed');
  const serverError = Object.assign(new Error('BFF down'), { digest: 'abc' });

  beforeEach(() => {
    retry.mockClear();
    captureException.mockClear();
    jest.mocked(useParams).mockReturnValue({ category: 'co2-emissions' });
  });

  it('should keep the category header', () => {
    render(<CategoryError error={error} retry={retry} />);

    expect(screen.getByRole('heading', { level: 1, name: 'CO2 Emissions' })).toBeInTheDocument();
  });

  it('should show the data unavailable warning for a server error, not the generic error', () => {
    render(<CategoryError error={serverError} retry={retry} />);

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

  it('should show a generic message for an error raised in the browser', () => {
    render(<CategoryError error={error} retry={retry} />);

    const alert = screen.getByRole('alert');
    expect(
      within(alert).getByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(alert).toHaveTextContent('An unexpected error occurred while showing this page.');
    expect(screen.queryByTestId('data-unavailable')).not.toBeInTheDocument();
  });

  it('should report an error without a digest', () => {
    render(<CategoryError error={error} retry={retry} />);

    expect(captureException).toHaveBeenCalledWith(error);
  });

  it('should not report an error the server already reported', () => {
    render(<CategoryError error={serverError} retry={retry} />);

    expect(captureException).not.toHaveBeenCalled();
  });

  it('should render only the warning when the slug is not a category', () => {
    jest.mocked(useParams).mockReturnValue({ category: 'unknown' });
    render(<CategoryError error={serverError} retry={retry} />);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByTestId('data-unavailable')).toBeInTheDocument();
  });
});

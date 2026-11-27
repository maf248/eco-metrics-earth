import * as Sentry from '@sentry/nextjs';
import { fireEvent, render, screen, within } from '@testing-library/react';

import ErrorPage from '@/app/error';
import { ErrorIcon, NotFoundIcon } from '@/components/icons';

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));

const captureException = Sentry.captureException as jest.Mock;

describe('ErrorPage', () => {
  const mockReset = jest.fn();
  const testError = new Error('Test error message');

  beforeEach(() => {
    mockReset.mockClear();
    captureException.mockClear();
  });

  it('should render the error heading', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Oops! Something went wrong…' }),
    ).toBeTruthy();
  });

  it('should render the error description', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(screen.getByText('An unexpected error occurred while loading this page.')).toBeTruthy();
  });

  it('should render a Try again button that calls reset on click', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    const retryButton = screen.getByRole('button', { name: 'Try again' });
    expect(retryButton).toBeTruthy();

    fireEvent.click(retryButton);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('should keep the icon decorative and leave naming the error to the heading', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    const icon = screen.getByTestId('error-icon');
    // aria-label is prohibited on a generic <div> (ARIA 1.2), so the wrapper carries no name.
    expect(icon).not.toHaveAttribute('aria-label');
    expect(icon.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render a Go back home link pointing to /', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    const homeLink = screen.getByRole('link', { name: 'Go back home' });
    expect(homeLink).toBeTruthy();
    // next/link strips trailing slashes in jsdom
    expect(homeLink.getAttribute('href')).toBe('/');
  });

  it('should announce only the heading and message through role="alert", not the buttons', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    const alert = screen.getByRole('alert');
    expect(within(alert).getByRole('heading', { level: 1 })).toBeTruthy();
    expect(
      within(alert).getByText('An unexpected error occurred while loading this page.'),
    ).toBeTruthy();
    expect(within(alert).queryByRole('button')).toBeNull();
    expect(within(alert).queryByRole('link')).toBeNull();
  });

  it('should render the icon wrapper with data-testid', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(screen.getByTestId('error-icon')).toBeTruthy();
  });

  it('should show the generic error icon, not the 404 icon', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    const shown = screen.getByTestId('error-icon').querySelector('svg')?.innerHTML;
    const errorIcon = render(<ErrorIcon />).container.querySelector('svg')?.innerHTML;
    const notFoundIcon = render(<NotFoundIcon />).container.querySelector('svg')?.innerHTML;

    expect(shown).toBeTruthy();
    expect(errorIcon).toBeTruthy();
    expect(shown).toBe(errorIcon);
    expect(shown).not.toBe(notFoundIcon);
  });

  it('should report a client error without a digest to Sentry once', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(testError);
  });

  it('should not report an error with a digest, because the server already did', () => {
    const serverError = Object.assign(new Error('server failure'), { digest: 'abc' });
    render(<ErrorPage error={serverError} reset={mockReset} />);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('should match snapshot', () => {
    const { asFragment } = render(<ErrorPage error={testError} reset={mockReset} />);
    expect(asFragment()).toMatchSnapshot();
  });
});

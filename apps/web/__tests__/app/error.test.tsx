import { fireEvent, render, screen } from '@testing-library/react';

import ErrorPage from '@/app/error';

describe('ErrorPage', () => {
  const mockReset = jest.fn();
  const testError = new Error('Test error message');

  beforeEach(() => {
    mockReset.mockClear();
    // Suppress console.error from the useEffect log in the component
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('should have aria-label="Error" on the icon wrapper', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    const icon = screen.getByTestId('error-icon');
    expect(icon.getAttribute('aria-label')).toBe('Error');
  });

  it('should render a Go back home link pointing to /', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    const homeLink = screen.getByRole('link', { name: 'Go back home' });
    expect(homeLink).toBeTruthy();
    // next/link strips trailing slashes in jsdom
    expect(homeLink.getAttribute('href')).toBe('/');
  });

  it('should have role="alert" on the text content wrapper for screen reader announcement', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('should render the icon wrapper with data-testid', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(screen.getByTestId('error-icon')).toBeTruthy();
  });

  it('should log the error to console.error on mount', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(consoleSpy).toHaveBeenCalledWith('Uncaught error:', testError);
    consoleSpy.mockRestore();
  });

  it('should match snapshot', () => {
    const { asFragment } = render(<ErrorPage error={testError} reset={mockReset} />);
    expect(asFragment()).toMatchSnapshot();
  });
});

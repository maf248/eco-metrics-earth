import * as Sentry from '@sentry/nextjs';
import { fireEvent, render, screen } from '@testing-library/react';

import GlobalError from '@/app/global-error';

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));

const captureException = Sentry.captureException as jest.Mock;

describe('GlobalError', () => {
  const retry = jest.fn();

  beforeEach(() => {
    captureException.mockClear();
    retry.mockClear();
  });

  function renderGlobalError(error: Error & { digest?: string }) {
    // Rendering into the document element itself avoids invalid <html> nesting warnings.
    return render(<GlobalError error={error} retry={retry} />, {
      container: document,
      baseElement: document,
    });
  }

  it('should render a heading and a retry button that calls retry', () => {
    renderGlobalError(new Error('boom'));

    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('should render its own html and body', () => {
    renderGlobalError(new Error('boom'));

    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(document.body.querySelector('h1')).not.toBeNull();
  });

  it('should capture a client error without a digest', () => {
    const error = new Error('client failure');

    renderGlobalError(error);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it('should not capture an error with a digest', () => {
    renderGlobalError(Object.assign(new Error('server failure'), { digest: 'abc' }));

    expect(captureException).not.toHaveBeenCalled();
  });
});

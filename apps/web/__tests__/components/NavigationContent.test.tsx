import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';

import { NavigationContent } from '@/components/NavigationContent';
import { usePendingNavigation } from '@/components/PendingNavigation';

const mockUsePathname = jest.fn(() => '/ocean-health/');

jest.mock('next/navigation', () => ({ usePathname: () => mockUsePathname() }));
jest.mock('@/components/PendingNavigation', () => ({ usePendingNavigation: jest.fn() }));

function renderPendingOn(pendingHref: string | null) {
  jest.mocked(usePendingNavigation).mockReturnValue({ pendingHref, navigate: jest.fn() });
  return render(
    <NavigationContent>
      <p>Current page</p>
    </NavigationContent>,
  );
}

describe('NavigationContent', () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  it('should open a pending category at the top of the page', () => {
    renderPendingOn('/co2-emissions/');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('should move the focus to main when the focused link hides with the page', () => {
    const value = { pendingHref: null as string | null, navigate: jest.fn() };
    jest.mocked(usePendingNavigation).mockReturnValue(value);
    const page = () => (
      <NavigationContent>
        <a href="/co2-emissions/">Link in the page</a>
      </NavigationContent>
    );
    const { rerender } = render(page());
    screen.getByRole('link').focus();

    jest.mocked(usePendingNavigation).mockReturnValue({ ...value, pendingHref: '/co2-emissions/' });
    rerender(page());

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('should keep the scroll position for a pending route that is not a category', () => {
    renderPendingOn('/data-sources/');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('should wrap the page in the only main landmark with the skip link target', () => {
    renderPendingOn(null);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(main).toHaveClass('min-h-screen');
    expect(main).not.toHaveAttribute('aria-busy');
    expect(screen.getByText('Current page')).toBeVisible();
    expect(screen.queryByTestId('pending-category')).not.toBeInTheDocument();
  });

  it('should replace the page with the header and skeletons of a pending category', () => {
    renderPendingOn('/co2-emissions/');
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'CO2 Emissions' })).toBeInTheDocument();
    expect(screen.getByTestId('category-data-skeleton')).toBeInTheDocument();
    expect(screen.getByText('Current page')).not.toBeVisible();
  });

  it('should stop the effects of the page while it is hidden', () => {
    const onHide = jest.fn();
    function PageWithEffect() {
      useEffect(() => onHide, []);
      return null;
    }
    jest.mocked(usePendingNavigation).mockReturnValue({ pendingHref: null, navigate: jest.fn() });
    const { rerender } = render(
      <NavigationContent>
        <PageWithEffect />
      </NavigationContent>,
    );
    expect(onHide).not.toHaveBeenCalled();

    jest
      .mocked(usePendingNavigation)
      .mockReturnValue({ pendingHref: '/co2-emissions/', navigate: jest.fn() });
    rerender(
      <NavigationContent>
        <PageWithEffect />
      </NavigationContent>,
    );

    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('should show no skeleton for a pending placeholder category', () => {
    renderPendingOn('/reforestation/');
    expect(screen.getByRole('heading', { level: 1, name: 'Reforestation' })).toBeInTheDocument();
    expect(screen.getByText('Reforestation metrics — coming soon.')).toBeInTheDocument();
    expect(screen.queryByTestId('category-data-skeleton')).not.toBeInTheDocument();
  });

  it('should keep the page for a pending route that is not a category', () => {
    renderPendingOn('/data-sources/');
    expect(screen.queryByTestId('pending-category')).not.toBeInTheDocument();
    expect(screen.getByText('Current page')).toBeVisible();
  });

  it('should ignore a pending navigation to the current path', () => {
    renderPendingOn('/ocean-health');
    expect(screen.queryByTestId('pending-category')).not.toBeInTheDocument();
  });

  describe('progress bar', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should appear only after a navigation takes 200 ms', () => {
      renderPendingOn('/co2-emissions/');
      act(() => {
        jest.advanceTimersByTime(199);
      });
      expect(screen.queryByTestId('navigation-progress')).not.toBeInTheDocument();
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByTestId('navigation-progress')).toHaveAttribute('aria-hidden', 'true');
    });

    it('should disappear when the navigation completes', () => {
      const { rerender } = renderPendingOn('/co2-emissions/');
      act(() => {
        jest.advanceTimersByTime(200);
      });
      jest.mocked(usePendingNavigation).mockReturnValue({ pendingHref: null, navigate: jest.fn() });
      rerender(
        <NavigationContent>
          <p>Current page</p>
        </NavigationContent>,
      );
      expect(screen.queryByTestId('navigation-progress')).not.toBeInTheDocument();
    });

    it('should not appear for a navigation that ends within 200 ms', () => {
      const { unmount } = renderPendingOn('/co2-emissions/');
      unmount();
      renderPendingOn(null);
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(screen.queryByTestId('navigation-progress')).not.toBeInTheDocument();
    });
  });
});

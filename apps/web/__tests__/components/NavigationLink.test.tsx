import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { preloadEChart } from '@/components/charts/LazyEChart';
import { preloadPieEChart } from '@/components/charts/LazyPieEChart';
import { NavigationLink } from '@/components/NavigationLink';
import { PendingNavigationProvider } from '@/components/PendingNavigation';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
// `onNavigate` only fires under the real app router; the stand-in fires it on any click.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    onNavigate,
    ...props
  }: ComponentProps<'a'> & { href: string; onNavigate: NavigateHandler }) => (
    <a
      {...props}
      href={href}
      onClick={(event) => onNavigate({ preventDefault: () => event.preventDefault() })}
    >
      {children}
    </a>
  ),
}));

type NavigateHandler = (event: { preventDefault: () => void }) => void;
jest.mock('@/components/charts/LazyEChart', () => ({ preloadEChart: jest.fn() }));
jest.mock('@/components/charts/LazyPieEChart', () => ({ preloadPieEChart: jest.fn() }));

function renderLink(href: string) {
  render(
    <PendingNavigationProvider>
      <NavigationLink href={href}>Destination</NavigationLink>
    </PendingNavigationProvider>,
  );
  return screen.getByRole('link', { name: 'Destination' });
}

beforeEach(() => {
  jest.mocked(preloadEChart).mockClear();
  jest.mocked(preloadPieEChart).mockClear();
  mockPush.mockClear();
});

describe('NavigationLink', () => {
  it('should navigate through the provider on a plain click', async () => {
    const link = renderLink('/co2-emissions/');
    await act(async () => {
      fireEvent.click(link);
    });
    expect(mockPush).toHaveBeenCalledWith('/co2-emissions/');
  });

  it('should preload the charts when the user aims at a page that draws one', () => {
    fireEvent.pointerEnter(renderLink('/energy-sources/'));
    expect(preloadEChart).toHaveBeenCalled();
    expect(preloadPieEChart).toHaveBeenCalled();
  });

  it('should preload the charts on keyboard focus', () => {
    fireEvent.focus(renderLink('/global-temperature/'));
    expect(preloadEChart).toHaveBeenCalled();
    expect(preloadPieEChart).not.toHaveBeenCalled();
  });

  it('should not preload charts for a page without them', () => {
    fireEvent.pointerEnter(renderLink('/water-footprint/'));
    expect(preloadEChart).not.toHaveBeenCalled();
  });

  it('should not preload charts for a route that is not a category', () => {
    fireEvent.pointerEnter(renderLink('/data-sources/'));
    expect(preloadEChart).not.toHaveBeenCalled();
  });
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { NavigationLink } from '@/components/NavigationLink';
import { PendingNavigationProvider, usePendingNavigation } from '@/components/PendingNavigation';

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

function Pending() {
  const { pendingHref } = usePendingNavigation();
  return <output>{pendingHref ?? 'none'}</output>;
}

function renderLink(href: string) {
  render(
    <PendingNavigationProvider>
      <NavigationLink href={href}>Destination</NavigationLink>
      <Pending />
    </PendingNavigationProvider>,
  );
  return screen.getByRole('link', { name: 'Destination' });
}

beforeEach(() => {
  mockPush.mockClear();
});

describe('usePendingNavigation', () => {
  it('should have no pending destination outside a provider', () => {
    render(<Pending />);
    expect(screen.getByRole('status')).toHaveTextContent('none');
  });

  it('should go back to no destination when the navigation finishes', async () => {
    render(
      <PendingNavigationProvider>
        <NavigationLink href="/co2-emissions/">Destination</NavigationLink>
        <Pending />
      </PendingNavigationProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Destination' }));
    });
    expect(mockPush).toHaveBeenCalledWith('/co2-emissions/');
    expect(screen.getByRole('status')).toHaveTextContent('none');
  });
});

describe('PendingNavigationProvider scroll', () => {
  beforeEach(() => {
    window.history.replaceState(null, '');
    jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 600 });
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    jest.restoreAllMocks();
  });

  function popState() {
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    });
  }

  it('should put the scroll of a page back the first time the browser returns to it', () => {
    fireEvent.click(renderLink('/co2-emissions/'));

    popState();

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 600, behavior: 'instant' });
  });

  it('should leave later returns to the browser', () => {
    fireEvent.click(renderLink('/co2-emissions/'));

    popState();
    popState();

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('should leave a page reached without a click to the browser', () => {
    renderLink('/co2-emissions/');

    popState();

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

import { act, render, screen } from '@testing-library/react';

import { RenderWhenVisible } from '@/components/charts/RenderWhenVisible';

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

describe('RenderWhenVisible', () => {
  const originalObserver = global.IntersectionObserver;
  let callback: ObserverCallback | undefined;
  let options: IntersectionObserverInit | undefined;
  const disconnect = jest.fn();
  const observe = jest.fn();

  beforeEach(() => {
    callback = undefined;
    disconnect.mockClear();
    observe.mockClear();
    global.IntersectionObserver = class {
      constructor(cb: ObserverCallback, init?: IntersectionObserverInit) {
        callback = cb;
        options = init;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    global.IntersectionObserver = originalObserver;
  });

  it('should show the skeleton and not mount the children until it intersects', () => {
    render(
      <RenderWhenVisible>
        <p>chart</p>
      </RenderWhenVisible>,
    );

    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('chart')).not.toBeInTheDocument();
    expect(observe).toHaveBeenCalledTimes(1);
    expect(options?.rootMargin).toBeDefined();
  });

  it('should ignore a report without intersection', () => {
    render(
      <RenderWhenVisible>
        <p>chart</p>
      </RenderWhenVisible>,
    );

    act(() => callback?.([{ isIntersecting: false }]));

    expect(screen.queryByText('chart')).not.toBeInTheDocument();
  });

  it('should mount the children and stop observing on the first intersection', () => {
    render(
      <RenderWhenVisible>
        <p>chart</p>
      </RenderWhenVisible>,
    );

    act(() => callback?.([{ isIntersecting: true }]));

    expect(screen.getByText('chart')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
    expect(disconnect).toHaveBeenCalled();
  });

  it('should disconnect on unmount', () => {
    const { unmount } = render(
      <RenderWhenVisible>
        <p>chart</p>
      </RenderWhenVisible>,
    );

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });

  it('should mount the children immediately without IntersectionObserver', () => {
    Reflect.deleteProperty(global, 'IntersectionObserver');

    render(
      <RenderWhenVisible>
        <p>chart</p>
      </RenderWhenVisible>,
    );

    expect(screen.getByText('chart')).toBeInTheDocument();
  });

  it('should use the chart height classes for the skeleton', () => {
    render(
      <RenderWhenVisible>
        <p>chart</p>
      </RenderWhenVisible>,
    );

    expect(screen.getByTestId('chart-skeleton')).toHaveClass('h-72', 'sm:h-96');
  });
});

import { fireEvent, render, screen } from '@testing-library/react';

import NavScrollContainer from '../../src/components/NavScrollContainer';

describe('NavScrollContainer', () => {
  it('should render a <ul> with role="list"', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    expect(screen.getByRole('list')).toBeTruthy();
  });

  it('should render children inside the list', () => {
    render(
      <NavScrollContainer>
        <li>Item 1</li>
        <li>Item 2</li>
      </NavScrollContainer>,
    );
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 2')).toBeTruthy();
  });

  it('should not render scroll affordances on initial render', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const hiddenElements = document.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenElements.length).toBe(0);
  });

  it('should render the <ul> with an aria-label attribute', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const ul = screen.getByRole('list');
    expect(ul.getAttribute('aria-label')).toBeTruthy();
  });

  describe('scroll affordances', () => {
    function setScrollProps(
      el: Element,
      opts: { scrollLeft: number; scrollWidth: number; clientWidth: number },
    ) {
      Object.defineProperty(el, 'scrollLeft', { value: opts.scrollLeft, configurable: true });
      Object.defineProperty(el, 'scrollWidth', { value: opts.scrollWidth, configurable: true });
      Object.defineProperty(el, 'clientWidth', { value: opts.clientWidth, configurable: true });
    }

    it('should show no affordances when content is not scrollable', () => {
      render(<NavScrollContainer>{null}</NavScrollContainer>);
      const ul = screen.getByRole('list');
      setScrollProps(ul, { scrollLeft: 0, scrollWidth: 200, clientWidth: 200 });
      fireEvent.scroll(ul);
      const affordances = document.querySelectorAll('[aria-hidden="true"]');
      expect(affordances.length).toBe(0);
    });

    it('should show right affordance when scrollLeft is 0 and content overflows', () => {
      render(<NavScrollContainer>{null}</NavScrollContainer>);
      const ul = screen.getByRole('list');
      setScrollProps(ul, { scrollLeft: 0, scrollWidth: 400, clientWidth: 200 });
      fireEvent.scroll(ul);
      const affordances = document.querySelectorAll('[aria-hidden="true"]');
      expect(affordances.length).toBe(1);
      expect(affordances[0].className).toContain('bg-gradient-to-l');
    });

    it('should show both affordances when scrolled to the middle', () => {
      render(<NavScrollContainer>{null}</NavScrollContainer>);
      const ul = screen.getByRole('list');
      setScrollProps(ul, { scrollLeft: 100, scrollWidth: 400, clientWidth: 200 });
      fireEvent.scroll(ul);
      const affordances = document.querySelectorAll('[aria-hidden="true"]');
      expect(affordances.length).toBe(2);
    });

    it('should show only left affordance when fully scrolled to the right', () => {
      render(<NavScrollContainer>{null}</NavScrollContainer>);
      const ul = screen.getByRole('list');
      setScrollProps(ul, { scrollLeft: 200, scrollWidth: 400, clientWidth: 200 });
      fireEvent.scroll(ul);
      const affordances = document.querySelectorAll('[aria-hidden="true"]');
      expect(affordances.length).toBe(1);
      expect(affordances[0].className).toContain('bg-gradient-to-r');
    });
  });
});

describe('NavScrollContainer — layout classes', () => {
  it('should render the <ul> with items-stretch so all items fill nav height', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const ul = screen.getByRole('list');
    expect(ul.className).toContain('items-stretch');
  });

  it('should NOT have items-center on the <ul> (would misalign icons)', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const ul = screen.getByRole('list');
    expect(ul.className).not.toContain('items-center');
  });
});

describe('NavScrollContainer — scroll affordance widths', () => {
  function setScrollProps(
    el: Element,
    opts: { scrollLeft: number; scrollWidth: number; clientWidth: number },
  ) {
    Object.defineProperty(el, 'scrollLeft', { value: opts.scrollLeft, configurable: true });
    Object.defineProperty(el, 'scrollWidth', { value: opts.scrollWidth, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: opts.clientWidth, configurable: true });
  }

  it('should render right affordance with w-12 class', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const ul = screen.getByRole('list');
    setScrollProps(ul, { scrollLeft: 0, scrollWidth: 400, clientWidth: 200 });
    fireEvent.scroll(ul);
    const affordances = document.querySelectorAll('[aria-hidden="true"]');
    expect(affordances[0].className).toContain('w-12');
  });

  it('should render left affordance with w-12 class', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const ul = screen.getByRole('list');
    setScrollProps(ul, { scrollLeft: 200, scrollWidth: 400, clientWidth: 200 });
    fireEvent.scroll(ul);
    const affordances = document.querySelectorAll('[aria-hidden="true"]');
    expect(affordances[0].className).toContain('w-12');
  });
});

describe('NavScrollContainer — vertical scroll affordances', () => {
  function setVerticalScrollProps(
    el: Element,
    opts: { scrollTop: number; scrollHeight: number; clientHeight: number },
  ) {
    Object.defineProperty(el, 'scrollTop', { value: opts.scrollTop, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: opts.scrollHeight, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: opts.clientHeight, configurable: true });
  }

  // Top affordance fades downward (to-b), bottom affordance fades upward (to-t).
  const topAffordance = () => document.querySelector('[aria-hidden="true"].bg-gradient-to-b');
  const bottomAffordance = () => document.querySelector('[aria-hidden="true"].bg-gradient-to-t');

  it('should show no vertical affordances when content is not vertically scrollable', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const ul = screen.getByRole('list');
    setVerticalScrollProps(ul, { scrollTop: 0, scrollHeight: 300, clientHeight: 300 });
    fireEvent.scroll(ul);
    expect(topAffordance()).toBeNull();
    expect(bottomAffordance()).toBeNull();
  });

  it('should show only the bottom affordance when scrolled to the top with overflow', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const ul = screen.getByRole('list');
    setVerticalScrollProps(ul, { scrollTop: 0, scrollHeight: 600, clientHeight: 300 });
    fireEvent.scroll(ul);
    expect(topAffordance()).toBeNull();
    expect(bottomAffordance()).not.toBeNull();
  });

  it('should show both vertical affordances when scrolled to the middle', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const ul = screen.getByRole('list');
    setVerticalScrollProps(ul, { scrollTop: 150, scrollHeight: 600, clientHeight: 300 });
    fireEvent.scroll(ul);
    expect(topAffordance()).not.toBeNull();
    expect(bottomAffordance()).not.toBeNull();
  });

  it('should show only the top affordance when scrolled to the bottom', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const ul = screen.getByRole('list');
    setVerticalScrollProps(ul, { scrollTop: 300, scrollHeight: 600, clientHeight: 300 });
    fireEvent.scroll(ul);
    expect(topAffordance()).not.toBeNull();
    expect(bottomAffordance()).toBeNull();
  });

  it('should hide vertical affordances below the lg breakpoint', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const ul = screen.getByRole('list');
    setVerticalScrollProps(ul, { scrollTop: 150, scrollHeight: 600, clientHeight: 300 });
    fireEvent.scroll(ul);
    for (const el of [topAffordance(), bottomAffordance()]) {
      expect(el?.className).toContain('hidden');
      expect(el?.className).toContain('lg:block');
    }
  });
});

describe('NavScrollContainer snapshots', () => {
  it('should match snapshot with no scroll affordances', () => {
    const { asFragment } = render(
      <NavScrollContainer>
        <li>Item 1</li>
        <li>Item 2</li>
      </NavScrollContainer>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});

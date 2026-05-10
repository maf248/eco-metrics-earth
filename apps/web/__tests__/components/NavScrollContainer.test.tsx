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

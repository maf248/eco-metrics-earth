import { fireEvent, render, screen } from '@testing-library/react';

import { ANCHOR_SCROLLING_CLASS, ANCHOR_SCROLL_MS, SmoothAnchor } from '@/components/SmoothAnchor';

describe('SmoothAnchor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.documentElement.classList.remove(ANCHOR_SCROLLING_CLASS);
  });

  it('should render a plain anchor to the fragment', () => {
    render(
      <SmoothAnchor href="#topics" className="cta">
        Explore
      </SmoothAnchor>,
    );
    const link = screen.getByRole('link', { name: 'Explore' });

    expect(link).toHaveAttribute('href', '#topics');
    expect(link).toHaveClass('cta');
  });

  it('should not mark the document as scrolling before a click', () => {
    render(<SmoothAnchor href="#topics">Explore</SmoothAnchor>);

    expect(document.documentElement).not.toHaveClass(ANCHOR_SCROLLING_CLASS);
  });

  it('should mark the document as scrolling on click and clear it afterwards', () => {
    render(<SmoothAnchor href="#topics">Explore</SmoothAnchor>);

    fireEvent.click(screen.getByRole('link', { name: 'Explore' }));
    expect(document.documentElement).toHaveClass(ANCHOR_SCROLLING_CLASS);

    jest.advanceTimersByTime(ANCHOR_SCROLL_MS);
    expect(document.documentElement).not.toHaveClass(ANCHOR_SCROLLING_CLASS);
  });

  it('should leave the navigation to the browser', () => {
    render(<SmoothAnchor href="#topics">Explore</SmoothAnchor>);

    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.click(screen.getByRole('link', { name: 'Explore' }))).toBe(true);
  });
});

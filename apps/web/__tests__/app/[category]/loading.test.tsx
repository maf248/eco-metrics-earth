import { render, screen } from '@testing-library/react';

import CategoryLoading from '../../../src/app/[category]/loading';

describe('CategoryLoading', () => {
  it('should render a <main> with id="main-content"', () => {
    render(<CategoryLoading />);
    const main = screen.getByRole('main');
    expect(main).toBeTruthy();
    expect(main.getAttribute('id')).toBe('main-content');
    expect(main.getAttribute('tabIndex')).toBe('-1');
  });

  it('should render placeholder elements with motion-safe:animate-pulse', () => {
    render(<CategoryLoading />);
    const pulsingElements = document.querySelectorAll('[class*="animate-pulse"]');
    expect(pulsingElements.length).toBeGreaterThanOrEqual(3);
  });

  it('should have the correct layout structure matching the category page', () => {
    render(<CategoryLoading />);
    const main = screen.getByRole('main');
    expect(main.className).toContain('flex');
    expect(main.className).toContain('min-h-screen');
    expect(main.className).toContain('flex-col');
    expect(main.className).toContain('items-center');
    expect(main.className).toContain('justify-start');
    expect(main.className).toContain('pt-14');
  });
});

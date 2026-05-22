import { render, screen } from '@testing-library/react';

import HomePage, { metadata } from '../../src/app/page';

describe('HomePage', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<HomePage />);
    expect(baseElement).toBeTruthy();
  });

  it('should render the page heading', () => {
    const { getByRole } = render(<HomePage />);
    expect(getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('should render the heading text "eco-metrics earth"', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: /eco-metrics earth/i })).toBeTruthy();
  });

  it('should render the "coming soon" text', () => {
    render(<HomePage />);
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
  });

  it('should render the site logo with aria-hidden', () => {
    render(<HomePage />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('should render a <main> element with id="main-content" and tabIndex={-1}', () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    expect(main?.getAttribute('id')).toBe('main-content');
    expect(main?.getAttribute('tabindex')).toBe('-1');
  });
});

describe('HomePage metadata', () => {
  it('should have title "eco-metrics earth"', () => {
    expect(metadata.title).toBe('eco-metrics earth');
  });

  it('should have a canonical URL ending with trailing slash', () => {
    const canonical = metadata.alternates?.canonical as string;
    expect(canonical).toMatch(/\/$/);
  });

  it('should have openGraph title set', () => {
    expect(metadata.openGraph?.title).toBe('eco-metrics earth');
  });

  it('should have openGraph url ending with trailing slash', () => {
    const url = metadata.openGraph?.url as string;
    expect(url).toMatch(/\/$/);
  });
});

describe('HomePage snapshots', () => {
  it('should match the full page snapshot', () => {
    const { asFragment } = render(<HomePage />);
    expect(asFragment()).toMatchSnapshot();
  });
});

describe('HomePage — layout', () => {
  it('should render the <main> with top-anchored layout (justify-start)', () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector('main');
    expect(main?.className).toContain('justify-start');
    expect(main?.className).not.toContain('justify-center');
  });

  it('should render the <main> with pt-20 top padding', () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector('main');
    expect(main?.className).toContain('pt-20');
  });
});

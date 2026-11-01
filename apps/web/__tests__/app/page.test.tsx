import { render, screen } from '@testing-library/react';

import HomePage, { metadata } from '@/app/page';
import { OG_IMAGE, SITE_DESCRIPTION } from '@/lib/socialMetadata';

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

  it('should leave the <main> landmark to the root layout', () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector('main')).toBeNull();
  });
});

describe('HomePage metadata', () => {
  it('should have the keyword-bearing home title', () => {
    expect(metadata.title).toBe('eco-metrics earth | CO2, Climate, Energy & Water Data');
  });

  it('should have a title of 50-60 characters', () => {
    const length = (metadata.title as string).length;
    expect(length).toBeGreaterThanOrEqual(50);
    expect(length).toBeLessThanOrEqual(60);
  });

  it('should use the shared site description', () => {
    expect(metadata.description).toBe(SITE_DESCRIPTION);
  });

  it('should match the openGraph and twitter title and description to the page', () => {
    expect(metadata.openGraph?.title).toBe(metadata.title);
    expect(metadata.openGraph?.description).toBe(metadata.description);
    expect(metadata.twitter?.title).toBe(metadata.title);
    expect(metadata.twitter?.description).toBe(metadata.description);
  });

  it('should have a canonical URL ending with trailing slash', () => {
    const canonical = metadata.alternates?.canonical as string;
    expect(canonical).toMatch(/\/$/);
  });

  it('should have openGraph url ending with trailing slash', () => {
    const url = metadata.openGraph?.url as string;
    expect(url).toMatch(/\/$/);
  });

  it('should keep the shared openGraph fields and social card', () => {
    const openGraph = metadata.openGraph as { type?: string; images?: unknown };
    expect(openGraph.type).toBe('website');
    expect(metadata.openGraph?.siteName).toBe('eco-metrics earth');
    expect(openGraph.images).toEqual([OG_IMAGE]);
  });

  it('should use the summary_large_image twitter card', () => {
    expect((metadata.twitter as { card?: string }).card).toBe('summary_large_image');
  });
});

describe('HomePage snapshots', () => {
  it('should match the full page snapshot', () => {
    const { asFragment } = render(<HomePage />);
    expect(asFragment()).toMatchSnapshot();
  });
});

describe('HomePage — layout', () => {
  it('should render the content with top-anchored layout (justify-start)', () => {
    const { container } = render(<HomePage />);
    const content = container.firstElementChild;
    expect(content?.className).toContain('justify-start');
    expect(content?.className).not.toContain('justify-center');
  });

  it('should render the content with pt-14 top padding', () => {
    const { container } = render(<HomePage />);
    const content = container.firstElementChild;
    expect(content?.className).toContain('pt-14');
  });
});

import React from 'react';
import { renderToString } from 'react-dom/server';

import RootLayout, { metadata } from '../../src/app/layout';

// Navbar uses NavLink which calls usePathname — mock it for SSR tests
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('RootLayout', () => {
  it('should be defined', () => {
    expect(RootLayout).toBeDefined();
  });

  it('should render html with lang="en" and dark mode class', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('lang="en"');
    expect(html).toContain('class="dark"');
    expect(html).toContain('test content');
  });

  it('should render the Navbar inside the layout', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('aria-label="Main navigation"');
  });

  it('should render the content wrapper with correct offset classes', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('pb-16');
    expect(html).toContain('lg:pl-64');
  });

  it('should render a skip-to-content link with href="#main-content"', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('Skip to main content');
  });

  it('should render the main content wrapper with id="main-content"', () => {
    const html = renderToString(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(html).toContain('id="main-content"');
  });
});

describe('metadata', () => {
  it('should have a default title', () => {
    expect((metadata.title as { default: string }).default).toBe('eco-metrics earth');
  });

  it('should have a title template', () => {
    expect((metadata.title as { template: string }).template).toBe('%s — eco-metrics earth');
  });

  it('should have a non-empty description', () => {
    expect(typeof metadata.description).toBe('string');
    expect((metadata.description as string).length).toBeGreaterThan(0);
  });
});

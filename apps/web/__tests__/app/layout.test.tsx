import React from 'react';
import { renderToString } from 'react-dom/server';

import RootLayout from '../../src/app/layout';

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
});

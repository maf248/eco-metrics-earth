import React from 'react';
import { renderToString } from 'react-dom/server';
import RootLayout from '../../src/app/layout';

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
});

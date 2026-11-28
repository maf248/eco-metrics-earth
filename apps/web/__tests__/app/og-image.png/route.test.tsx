/**
 * @jest-environment node
 */
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { GET } from '@/app/og-image.png/route';
import { SITE_DESCRIPTION } from '@/lib/socialMetadata';

// Satori is not run in unit tests: the stub keeps the element and options the route passes.
jest.mock('next/og', () => ({
  ImageResponse: class extends Response {
    constructor(
      readonly element: ReactElement,
      readonly options: { width: number; height: number },
    ) {
      super(null, { status: 200, headers: { 'content-type': 'image/png' } });
    }
  },
}));

describe('site social card route', () => {
  it('should keep the site name, tagline and call to action on a 1200x630 card', () => {
    const response = GET() as unknown as { element: ReactElement; options: object };

    expect(response.options).toEqual({ width: 1200, height: 630 });
    const markup = renderToStaticMarkup(response.element);
    expect(markup).toContain('eco-metrics earth');
    expect(markup).toContain(SITE_DESCRIPTION);
    expect(markup).toContain('Explore the data →');
  });
});

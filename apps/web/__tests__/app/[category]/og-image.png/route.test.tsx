/**
 * @jest-environment node
 */
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { generateStaticParams, GET } from '@/app/[category]/og-image.png/route';
import { CATEGORY_DESCRIPTIONS } from '@/lib/categoryMetadata';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

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

type StubbedImageResponse = Response & {
  element: ReactElement;
  options: { width: number; height: number };
};

const request = new Request('http://localhost:3000/');
const call = (category: string) => GET(request, { params: Promise.resolve({ category }) });

describe('category social card route', () => {
  it('should prerender a card for every category, live or placeholder', () => {
    expect(generateStaticParams()).toEqual(
      Object.values(ECO_CATEGORIES).map((category) => ({ category })),
    );
  });

  it('should draw a 1200x630 card with the category icon, name, description and site name', async () => {
    const response = (await call('co2-emissions')) as StubbedImageResponse;

    expect(response.options).toEqual({ width: 1200, height: 630 });
    const markup = renderToStaticMarkup(response.element);
    expect(markup).toContain('CO2 Emissions');
    expect(markup).toContain(CATEGORY_DESCRIPTIONS['co2-emissions']);
    expect(markup).toContain('eco-metrics earth</div></div></div>');
    // The category's own icon (its 512 viewBox SVG), not the site logo.
    expect(markup).toMatch(/<svg[^>]*viewBox="0 0 512 512"[^>]*width="320"/);
  });

  it('should answer 404 for a slug that is not a category', async () => {
    const response = await call('not-a-category');

    expect(response.status).toBe(404);
  });
});

import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';

import CategoryLayout from '@/app/[category]/layout';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  }),
}));

describe('CategoryLayout', () => {
  afterEach(() => {
    jest.mocked(notFound).mockClear();
  });

  it('should render its children for a known category slug', async () => {
    const element = await CategoryLayout({
      children: <p>category content</p>,
      params: Promise.resolve({ category: 'water-footprint' }),
    });
    render(element);

    expect(screen.getByText('category content')).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('should call notFound() for an unknown category slug', async () => {
    await expect(
      CategoryLayout({
        children: <p>category content</p>,
        params: Promise.resolve({ category: 'unknown-category' }),
      }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});

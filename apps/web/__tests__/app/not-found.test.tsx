import { render, screen } from '@testing-library/react';

import NotFound from '@/app/not-found';

describe('NotFound page', () => {
  it('should render the not-found heading', () => {
    render(<NotFound />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain("Oops! We couldn't find that...");
  });

  it('should not display the URL or slug', () => {
    render(<NotFound />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).not.toMatch(/\/[a-z]/);
  });

  it('should render the error icon wrapper', () => {
    render(<NotFound />);
    expect(screen.getByTestId('not-found-icon')).toBeTruthy();
  });

  it('should match snapshot', () => {
    const { asFragment } = render(<NotFound />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should render a link back to home on the icon', () => {
    render(<NotFound />);
    const link = screen.getByRole('link', { name: /go back to home/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/');
  });
  it('should leave the <main> landmark to the root layout', () => {
    const { container } = render(<NotFound />);
    expect(container.querySelector('main')).toBeNull();
  });
});

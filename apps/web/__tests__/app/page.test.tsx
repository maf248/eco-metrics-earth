import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from '../../src/app/page';

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
});

describe('HomePage snapshots', () => {
  it('should match the full page snapshot', () => {
    const { asFragment } = render(<HomePage />);
    expect(asFragment()).toMatchSnapshot();
  });
});

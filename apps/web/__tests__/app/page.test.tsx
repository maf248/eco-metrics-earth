import React from 'react';
import { render } from '@testing-library/react';
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
});

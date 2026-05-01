import React from 'react';
import { render, screen } from '@testing-library/react';

import NavScrollContainer from '../../src/components/NavScrollContainer';

describe('NavScrollContainer', () => {
  it('should render a <ul> with role="list"', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    expect(screen.getByRole('list')).toBeTruthy();
  });

  it('should render children inside the list', () => {
    render(
      <NavScrollContainer>
        <li>Item 1</li>
        <li>Item 2</li>
      </NavScrollContainer>,
    );
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 2')).toBeTruthy();
  });

  it('should not render scroll affordances on initial render', () => {
    render(<NavScrollContainer>{null}</NavScrollContainer>);
    const hiddenElements = document.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenElements.length).toBe(0);
  });
});

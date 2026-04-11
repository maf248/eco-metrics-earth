import React from 'react';
import { render } from '@testing-library/react';
import RootLayout from '../../src/app/layout';

describe('RootLayout', () => {
  it('should be defined', () => {
    expect(RootLayout).toBeDefined();
  });

  it('should render without errors', () => {
    const { baseElement } = render(
      <RootLayout>
        <div>test content</div>
      </RootLayout>,
    );
    expect(baseElement).toBeTruthy();
  });
});

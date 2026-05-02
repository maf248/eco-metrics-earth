import React from 'react';
import { render, screen } from '@testing-library/react';

import NavLink from '../../src/components/NavLink';
import { AirQualityIcon } from '../../src/components/icons';

const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('NavLink', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/some-other-page/');
  });

  it('should render the label text', () => {
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    expect(screen.getByText('Air Quality')).toBeTruthy();
  });

  it('should render a link with the correct href', () => {
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const link = screen.getByRole('link');
    // next/link strips trailing slashes in jsdom — assert the normalized form
    expect(link.getAttribute('href')).toBe('/air-quality');
  });

  it('should render the icon wrapper', () => {
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    expect(screen.getByTestId('nav-icon')).toBeTruthy();
  });

  it('should render the icon as an <svg> element, not an <img>', () => {
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const iconWrapper = screen.getByTestId('nav-icon');
    expect(iconWrapper.querySelector('svg')).not.toBeNull();
    expect(iconWrapper.querySelector('img')).toBeNull();
  });

  it('should NOT have aria-current when the route does not match', () => {
    mockUsePathname.mockReturnValue('/ocean-health/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-current')).toBeNull();
  });

  it('should have aria-current="page" when the route matches', () => {
    mockUsePathname.mockReturnValue('/air-quality/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it('should NOT have aria-current="page" when a different route is active', () => {
    mockUsePathname.mockReturnValue('/deforestation/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-current')).toBeNull();
  });
});

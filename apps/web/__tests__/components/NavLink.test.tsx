import { render, screen } from '@testing-library/react';

import { AirQualityIcon } from '../../src/components/icons';
import NavLink from '../../src/components/NavLink';

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

describe('NavLink — isActive trailing-slash normalisation', () => {
  it('should be active when href has trailing slash but pathname does not', () => {
    mockUsePathname.mockReturnValue('/air-quality');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    expect(screen.getByRole('link').getAttribute('aria-current')).toBe('page');
  });

  it('should be active when href has no trailing slash but pathname does', () => {
    mockUsePathname.mockReturnValue('/air-quality/');
    render(<NavLink href="/air-quality" icon={AirQualityIcon} label="Air Quality" />);
    expect(screen.getByRole('link').getAttribute('aria-current')).toBe('page');
  });

  it('should keep root path "/" active', () => {
    mockUsePathname.mockReturnValue('/');
    render(<NavLink href="/" icon={AirQualityIcon} label="Home" />);
    expect(screen.getByRole('link').getAttribute('aria-current')).toBe('page');
  });

  it('should return false for different paths', () => {
    mockUsePathname.mockReturnValue('/ocean-health/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    expect(screen.getByRole('link').getAttribute('aria-current')).toBeNull();
  });
});

describe('NavLink — icon background classes', () => {
  it('should apply active icon background when route matches', () => {
    mockUsePathname.mockReturnValue('/air-quality/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const iconWrapper = screen.getByTestId('nav-icon');
    expect(iconWrapper.className).toContain('bg-white/15');
    expect(iconWrapper.className).not.toContain('bg-white/10');
  });

  it('should apply inactive icon background when route does not match', () => {
    mockUsePathname.mockReturnValue('/ocean-health/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const iconWrapper = screen.getByTestId('nav-icon');
    expect(iconWrapper.className).toContain('bg-white/10');
    expect(iconWrapper.className).not.toContain('bg-white/15');
  });
});

describe('NavLink — label rendering', () => {
  it('should render label text that can wrap (no truncation) on mobile', () => {
    mockUsePathname.mockReturnValue('/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Endangered Species" />);
    const labelSpan = screen.getByText('Endangered Species');
    expect(labelSpan.className).toContain('whitespace-normal');
    expect(labelSpan.className).toContain('break-words');
    // lg:truncate is correct (desktop only) — verify no bare 'truncate' class
    expect(labelSpan.className).not.toMatch(/(?<![a-z:])truncate(?!-)/);
  });

  it('should render the label centered on mobile', () => {
    mockUsePathname.mockReturnValue('/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const labelSpan = screen.getByText('Air Quality');
    expect(labelSpan.className).toContain('text-center');
  });
});

describe('NavLink — layout classes', () => {
  it('should have h-full on mobile and lg:h-auto on desktop', () => {
    mockUsePathname.mockReturnValue('/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('h-full');
    expect(link.className).toContain('lg:h-auto');
  });

  it('should have fixed width w-20 on mobile', () => {
    mockUsePathname.mockReturnValue('/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('w-20');
  });

  it('should align items to start (top of nav) on mobile', () => {
    mockUsePathname.mockReturnValue('/');
    render(<NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('justify-start');
  });
});

describe('NavLink snapshots', () => {
  it('should match snapshot when inactive', () => {
    mockUsePathname.mockReturnValue('/ocean-health/');
    const { asFragment } = render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should match snapshot when active', () => {
    mockUsePathname.mockReturnValue('/air-quality/');
    const { asFragment } = render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should match snapshot with a long wrapping label', () => {
    mockUsePathname.mockReturnValue('/');
    const { asFragment } = render(
      <NavLink href="/endangered-species/" icon={AirQualityIcon} label="Endangered Species" />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});

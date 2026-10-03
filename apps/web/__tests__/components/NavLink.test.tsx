import { render, screen } from '@testing-library/react';

import { AirQualityIcon } from '@/components/icons';
import NavLink from '@/components/NavLink';

describe('NavLink', () => {
  it('should render the label text', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    expect(screen.getByText('Air Quality')).toBeTruthy();
  });

  it('should render a link with the correct href', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    const link = screen.getByRole('link');
    // next/link strips trailing slashes in jsdom — assert the normalized form
    expect(link.getAttribute('href')).toBe('/air-quality');
  });

  it('should render the icon wrapper', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    expect(screen.getByTestId('nav-icon')).toBeTruthy();
  });

  it('should render the icon as an <svg> element, not an <img>', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    const iconWrapper = screen.getByTestId('nav-icon');
    expect(iconWrapper.querySelector('svg')).not.toBeNull();
    expect(iconWrapper.querySelector('img')).toBeNull();
  });

  it('should NOT have aria-current when isActive is false', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-current')).toBeNull();
  });

  it('should have aria-current="page" when isActive is true', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={true} />,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it('should NOT have aria-current="page" when isActive is false', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-current')).toBeNull();
  });
});

describe('NavLink — icon background classes', () => {
  it('should apply active icon background when isActive is true', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={true} />,
    );
    const iconWrapper = screen.getByTestId('nav-icon');
    expect(iconWrapper.className).toContain('bg-gray-400');
    expect(iconWrapper.className).toContain('dark:bg-white/15');
  });

  it('should apply inactive icon background when isActive is false', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    const iconWrapper = screen.getByTestId('nav-icon');
    expect(iconWrapper.className).toContain('bg-gray-300');
    expect(iconWrapper.className).toContain('dark:bg-white/10');
  });
});

describe('NavLink — label rendering', () => {
  it('should render label text that can wrap (no truncation) on mobile', () => {
    render(
      <NavLink
        href="/air-quality/"
        icon={AirQualityIcon}
        label="Endangered Species"
        isActive={false}
      />,
    );
    const labelSpan = screen.getByText('Endangered Species');
    expect(labelSpan.className).toContain('whitespace-normal');
    expect(labelSpan.className).toContain('wrap-break-word');
    // lg:truncate is correct (desktop only) — verify no bare 'truncate' class
    expect(labelSpan.className).not.toMatch(/(?<![a-z:])truncate(?!-)/);
  });

  it('should render the label centered on mobile', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    const labelSpan = screen.getByText('Air Quality');
    expect(labelSpan.className).toContain('text-center');
  });
});

describe('NavLink — layout classes', () => {
  it('should have h-full on mobile and lg:h-auto on desktop', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    const link = screen.getByRole('link');
    expect(link.className).toContain('h-full');
    expect(link.className).toContain('lg:h-auto');
  });

  it('should have fixed width w-20 on mobile', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    const link = screen.getByRole('link');
    expect(link.className).toContain('w-20');
  });

  it('should align items to start (top of nav) on mobile', () => {
    render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    const link = screen.getByRole('link');
    expect(link.className).toContain('justify-start');
  });
});

describe('NavLink snapshots', () => {
  it('should match snapshot when inactive', () => {
    const { asFragment } = render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={false} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should match snapshot when active', () => {
    const { asFragment } = render(
      <NavLink href="/air-quality/" icon={AirQualityIcon} label="Air Quality" isActive={true} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('should match snapshot with a long wrapping label', () => {
    const { asFragment } = render(
      <NavLink
        href="/endangered-species/"
        icon={AirQualityIcon}
        label="Endangered Species"
        isActive={false}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});

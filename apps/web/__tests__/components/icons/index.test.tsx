import { render } from '@testing-library/react';

import * as Icons from '@/components/icons';

const EXPECTED_ICONS = [
  'AirQualityIcon',
  'BottleIcon',
  'Co2EmissionsIcon',
  'DeforestationIcon',
  'EndangeredSpeciesIcon',
  'EnergySourcesIcon',
  'GlacierMeltingIcon',
  'GlobalTemperatureIcon',
  'LightBulbIcon',
  'NotFoundIcon',
  'OceanHealthIcon',
  'ReforestationIcon',
  'SiteLogoIcon',
  'WasteRecyclingIcon',
  'WaterFootprintIcon',
] as const;

describe('Icon components barrel export', () => {
  it('should export all 15 named icon components', () => {
    EXPECTED_ICONS.forEach((name) => {
      expect(typeof Icons[name]).toBe('function');
    });
  });

  EXPECTED_ICONS.forEach((name) => {
    const Icon = Icons[name];

    it(`${name} should render a decorative svg hidden from assistive tech when no title is provided`, () => {
      const { container } = render(<Icon />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).not.toHaveAttribute('aria-labelledby');
      expect(svg?.querySelector('title')).toBeNull();
    });

    it(`${name} should expose its title to assistive tech when a title is provided`, () => {
      const titleText = `${name} accessible title`;
      const { container } = render(<Icon title={titleText} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg).not.toHaveAttribute('aria-hidden');
      const titleId = svg?.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();
      const titleElement = titleId ? container.querySelector(`title[id="${titleId}"]`) : null;
      expect(titleElement).not.toBeNull();
      expect(titleElement).toHaveTextContent(titleText);
    });
  });
});

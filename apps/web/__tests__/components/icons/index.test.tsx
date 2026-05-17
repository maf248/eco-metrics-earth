import { render } from '@testing-library/react';

import * as Icons from '../../../src/components/icons';

const EXPECTED_ICONS = [
  'AirQualityIcon',
  'BottleIcon',
  'Co2EmissionsIcon',
  'DeforestationIcon',
  'EndangeredSpeciesIcon',
  'GlacierMeltingIcon',
  'GlobalTemperatureIcon',
  'NotFoundIcon',
  'OceanHealthIcon',
  'ReforestationIcon',
  'RenewableEnergyIcon',
  'SiteLogoIcon',
  'WasteRecyclingIcon',
] as const;

describe('Icon components barrel export', () => {
  it('should export all 13 named icon components', () => {
    EXPECTED_ICONS.forEach((name) => {
      expect(typeof Icons[name]).toBe('function');
    });
  });

  EXPECTED_ICONS.forEach((name) => {
    it(`${name} should render an <svg> element`, () => {
      const Icon = Icons[name];
      const { container } = render(<Icon />);
      expect(container.querySelector('svg')).not.toBeNull();
    });
  });
});

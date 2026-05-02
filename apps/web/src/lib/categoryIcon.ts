import type { EcoCategory } from '@eco-metrics/shared';
import type React from 'react';

import {
  AirQualityIcon,
  BottleIcon,
  Co2EmissionsIcon,
  DeforestationIcon,
  EndangeredSpeciesIcon,
  GlacierMeltingIcon,
  GlobalTemperatureIcon,
  NotFoundIcon,
  OceanHealthIcon,
  ReforestationIcon,
  RenewableEnergyIcon,
  SiteLogoIcon,
  WasteRecyclingIcon,
} from '@/components/icons';

export type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

/**
 * Maps each EcoCategory slug to its inline SVG React component.
 */
export const CATEGORY_ICONS: Record<EcoCategory, IconComponent> = {
  'waste-recycling': WasteRecyclingIcon,
  'air-quality': AirQualityIcon,
  'endangered-species': EndangeredSpeciesIcon,
  'global-temperature': GlobalTemperatureIcon,
  deforestation: DeforestationIcon,
  'ocean-health': OceanHealthIcon,
  'co2-emissions': Co2EmissionsIcon,
  reforestation: ReforestationIcon,
  'glacier-melting': GlacierMeltingIcon,
  'plastic-pollution': BottleIcon,
  'renewable-energy': RenewableEnergyIcon,
};

export const SITE_LOGO_ICON: IconComponent = SiteLogoIcon;

export const NOT_FOUND_ICON: IconComponent = NotFoundIcon;

export function getCategoryIcon(slug: string): IconComponent {
  return CATEGORY_ICONS[slug as EcoCategory] ?? SITE_LOGO_ICON;
}

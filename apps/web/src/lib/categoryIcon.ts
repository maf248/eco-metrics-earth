import type { EcoCategory } from '@eco-metrics/shared';

/**
 * Maps each EcoCategory slug to its icon path under /public/icons/.
 * Fallback returns the generic earth globe icon.
 */
export const CATEGORY_ICONS: Record<EcoCategory, string> = {
  'waste-recycling': '/icons/recycle-svgrepo-com.svg',
  'air-quality': '/icons/air-contamination-factory-svgrepo-com.svg',
  'endangered-species': '/icons/panda-bear-panda-svgrepo-com.svg',
  'global-temperature': '/icons/thermometer-svgrepo-com.svg',
  deforestation: '/icons/forest-burn-svgrepo-com.svg',
  'ocean-health': '/icons/ocean-sea-splash-svgrepo-com.svg',
  'co2-emissions': '/icons/co2-svgrepo-com.svg',
  reforestation: '/icons/forest-svgrepo-com.svg',
  'glacier-melting': '/icons/global-warming-iceberg-svgrepo-com.svg',
  'plastic-pollution': '/icons/bottle-svgrepo-com.svg',
  'renewable-energy': '/icons/wind-mill-svgrepo-com.svg',
};

export const SITE_LOGO_ICON = '/icons/planet-earth-global-svgrepo-com.svg';

export function getCategoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug as EcoCategory] ?? SITE_LOGO_ICON;
}

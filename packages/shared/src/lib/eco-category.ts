export const ECO_CATEGORIES = {
  AIR_QUALITY: 'air-quality',
  ENDANGERED_SPECIES: 'endangered-species',
  GLOBAL_TEMPERATURE: 'global-temperature',
  DEFORESTATION: 'deforestation',
  OCEAN_HEALTH: 'ocean-health',
  CO2_EMISSIONS: 'co2-emissions',
} as const;

export type EcoCategory = (typeof ECO_CATEGORIES)[keyof typeof ECO_CATEGORIES];

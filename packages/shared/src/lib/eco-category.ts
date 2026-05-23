export const ECO_CATEGORIES = {
  WASTE_RECYCLING: 'waste-recycling',
  AIR_QUALITY: 'air-quality',
  ENDANGERED_SPECIES: 'endangered-species',
  GLOBAL_TEMPERATURE: 'global-temperature',
  DEFORESTATION: 'deforestation',
  OCEAN_HEALTH: 'ocean-health',
  CO2_EMISSIONS: 'co2-emissions',
  REFORESTATION: 'reforestation',
  GLACIER_MELTING: 'glacier-melting',
  PLASTIC_POLLUTION: 'plastic-pollution',
  RENEWABLE_ENERGY: 'renewable-energy',
  WATER_FOOTPRINT: 'water-footprint',
} as const;

export type EcoCategory = (typeof ECO_CATEGORIES)[keyof typeof ECO_CATEGORIES];

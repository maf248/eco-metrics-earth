import { fetchFromBff } from '@/lib/bffFetch';
import type { WaterFootprintProduct } from '@eco-metrics/shared';

/** Fetches the full water-footprint dataset from the BFF; throws when every attempt fails. */
export function getWaterFootprintProducts(): Promise<WaterFootprintProduct[]> {
  return fetchFromBff({
    path: '/water-footprint/products',
    label: 'Water footprint data',
    isData: (data): data is WaterFootprintProduct[] => Array.isArray(data),
  });
}

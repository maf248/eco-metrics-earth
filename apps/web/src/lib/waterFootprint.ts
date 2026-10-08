import { apiBaseUrl } from '@/lib/apiBaseUrl';
import { internalApiHeaders } from '@/lib/internalApiHeaders';
import type { WaterFootprintProduct } from '@eco-metrics/shared';

interface WaterFootprintDataResult {
  products: WaterFootprintProduct[];
  fetchFailed: boolean;
}

interface WaterFootprintSuccessResponse {
  success: true;
  data: WaterFootprintProduct[];
}

function isWaterFootprintResponse(value: unknown): value is WaterFootprintSuccessResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { success?: unknown; data?: unknown };
  return candidate.success === true && Array.isArray(candidate.data);
}

export async function getWaterFootprintProducts(): Promise<WaterFootprintDataResult> {
  try {
    const response = await fetch(`${apiBaseUrl()}/water-footprint/products`, {
      headers: internalApiHeaders(),
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { products: [], fetchFailed: true };
    }

    const payload: unknown = await response.json();

    if (!isWaterFootprintResponse(payload)) {
      return { products: [], fetchFailed: true };
    }

    return { products: payload.data, fetchFailed: false };
  } catch {
    return { products: [], fetchFailed: true };
  }
}

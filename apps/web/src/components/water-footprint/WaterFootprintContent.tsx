import type { WaterFootprintProduct } from '@eco-metrics/shared';

import { WaterFootprintTable } from '@/components/water-footprint/WaterFootprintTable';

interface WaterFootprintContentProps {
  products: WaterFootprintProduct[];
  fetchFailed: boolean;
}

export function WaterFootprintContent({ products, fetchFailed }: WaterFootprintContentProps) {
  return (
    <div className="w-full max-w-6xl px-4">
      <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
        Compare the water footprint of everyday products — from food and textiles to technology and
        manufactured goods.
      </p>

      {fetchFailed && (
        <p
          role="alert"
          className="mb-6 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200"
        >
          Water footprint data is temporarily unavailable. Please try again later.
        </p>
      )}

      {!fetchFailed && products.length === 0 && (
        <p className="text-gray-700 dark:text-gray-300">
          No water footprint data is currently available.
        </p>
      )}

      {!fetchFailed && products.length > 0 && (
        <>
          <WaterFootprintTable products={products} />
          <p className="mb-8 mt-6 text-sm text-gray-500 dark:text-gray-400">
            Equivalents are illustrative references: one average shower ≈ 65 L, one full bathtub ≈
            150 L. They are not part of the cited dataset.
          </p>
        </>
      )}
    </div>
  );
}

WaterFootprintContent.displayName = 'WaterFootprintContent';

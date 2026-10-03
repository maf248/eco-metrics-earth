import { WaterFootprintTable } from '@/components/water-footprint/WaterFootprintTable';
import type { WaterFootprintProduct } from '@eco-metrics/shared';

interface WaterFootprintContentProps {
  products: WaterFootprintProduct[];
  fetchFailed: boolean;
}

export function WaterFootprintContent({ products, fetchFailed }: WaterFootprintContentProps) {
  return (
    <div className="w-full max-w-6xl px-4">
      <p className="mb-3 text-center text-gray-600 dark:text-gray-400">
        Compare the water footprint of everyday products — from food and textiles to technology,
        manufactured goods and computing.
      </p>
      <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Entries are measured on different bases — see the &ldquo;Water type&rdquo; column.
        Blue-water values count freshwater withdrawals only, green + blue + grey values also count
        rainwater and the water needed to dilute pollution, and life-cycle values differ by whether
        they include the water embodied in electricity. Values of different water types are not
        directly comparable.
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

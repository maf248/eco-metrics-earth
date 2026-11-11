import Link from 'next/link';

import { SourceAttribution } from '@/components/SourceAttribution';
import { WaterFootprintTable } from '@/components/water-footprint/WaterFootprintTable';
import { LINK_CLASS_NAME } from '@/lib/linkClassName';
import type { DataSourcePublisher, WaterFootprintProduct } from '@eco-metrics/shared';

interface WaterFootprintContentProps {
  products: WaterFootprintProduct[];
}

function distinctPublishers(products: WaterFootprintProduct[]): DataSourcePublisher[] {
  const byName = new Map<string, DataSourcePublisher>();
  for (const { publisher } of products) {
    if (publisher && !byName.has(publisher.provider)) {
      byName.set(publisher.provider, publisher);
    }
  }
  return [...byName.values()];
}

export function WaterFootprintContent({ products }: WaterFootprintContentProps) {
  const publishers = distinctPublishers(products);

  return (
    <div className="w-full max-w-6xl sm:px-4">
      <p className="mb-3 text-center text-fg-secondary">
        Compare the water footprint of everyday products — from food and textiles to technology,
        manufactured goods and computing.
      </p>
      <p className="mb-6 text-center text-sm text-fg-muted">
        Entries are measured on different bases — see the &ldquo;Water type&rdquo; column.
        Blue-water values count freshwater withdrawals only, green + blue + grey values also count
        rainwater and the water needed to dilute pollution, and life-cycle values differ by whether
        they include the water embodied in electricity. Values of different water types are not
        directly comparable.
      </p>

      {products.length === 0 && (
        <p className="text-fg-body">No water footprint data is currently available.</p>
      )}

      {products.length > 0 && (
        <>
          <WaterFootprintTable products={products} />
          <p className="mt-6 text-sm text-fg-muted">
            Equivalents are illustrative references: one average shower ≈ 65 L, one full bathtub ≈
            150 L. They are not part of the cited dataset.
          </p>
          <p className="mb-8 mt-2 text-sm text-fg-muted">
            {publishers.length > 0 && (
              <>
                Some values are republished by{' '}
                {publishers.map((publisher, index) => (
                  <span key={publisher.provider}>
                    {index > 0 && ', '}
                    <SourceAttribution source={publisher} />
                  </span>
                ))}
                .{' '}
              </>
            )}
            <Link href="/data-sources/" className={LINK_CLASS_NAME}>
              All data sources
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

WaterFootprintContent.displayName = 'WaterFootprintContent';

import type { ReactNode } from 'react';

import { ChartSkeleton } from '@/components/charts/ChartSkeleton';
import { CARD_CLASS_NAME, KEY_FIGURES_CLASS_NAME } from '@/lib/cardClassNames';
import { CATEGORY_SKELETONS, type SkeletonBlock } from '@/lib/categorySkeletons';
import { waterFootprintCategorySlugMap } from '@eco-metrics/shared';
import type { EcoCategory } from '@eco-metrics/shared';

const PULSE_CLASS_NAME = 'bg-well motion-safe:animate-pulse';
const PRODUCT_CHIPS = ['All', ...Object.values(waterFootprintCategorySlugMap)];
const PRODUCT_ITEMS = ['first', 'second', 'third'];

/** Text drawn as bars, so its lines break exactly where the real copy does. */
function Bars({ children }: { children: ReactNode }) {
  return (
    <span
      className={`select-none rounded-md box-decoration-clone text-transparent ${PULSE_CLASS_NAME}`}
    >
      {children}
    </span>
  );
}

function Intro({ text, note }: { text: string; note?: string }) {
  return (
    <>
      <p className={`text-center ${note ? 'mb-3' : 'mb-6'}`}>
        <Bars>{text}</Bars>
      </p>
      {note && (
        <p className="mb-6 text-center text-sm">
          <Bars>{note}</Bars>
        </p>
      )}
    </>
  );
}

function KeyFigures({ lead, details }: { lead: string; details: readonly string[] }) {
  return (
    <div className={KEY_FIGURES_CLASS_NAME}>
      <p className="text-xl leading-relaxed sm:text-2xl">
        <Bars>{lead}</Bars>
      </p>
      {details.map((detail) => (
        <p key={detail} className="mt-2 text-lg leading-relaxed sm:text-xl">
          <Bars>{detail}</Bars>
        </p>
      ))}
    </div>
  );
}

function Control({ label, className, box }: { label: string; className: string; box: string }) {
  return (
    <div className={className}>
      <p className="mb-1 text-sm">
        <Bars>{label}</Bars>
      </p>
      <div className={`rounded-lg ${box} ${PULSE_CLASS_NAME}`} />
    </div>
  );
}

function Explorer({
  heading,
  chartTitle,
  hasMeasureToggle,
  hasDonut,
}: Extract<SkeletonBlock, { kind: 'explorer' }>) {
  return (
    <div className={CARD_CLASS_NAME}>
      <p className="mb-4 text-xl font-semibold">
        <Bars>{heading}</Bars>
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Control label="Country" className="w-full max-w-sm" box="h-11" />
        {hasMeasureToggle && <Control label="Measure" className="w-52" box="h-13.5" />}
      </div>
      <p className="mb-2 mt-6 text-base font-semibold leading-snug sm:text-lg">
        <Bars>{chartTitle}</Bars>
      </p>
      <ChartSkeleton />
      {hasDonut && (
        <div className="mt-6">
          <ChartSkeleton variant="donut" />
        </div>
      )}
    </div>
  );
}

function ProductList({ status }: { status: string }) {
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {PRODUCT_CHIPS.map((chip) => (
          <div key={chip}>
            <span
              className={`select-none rounded-full px-3 py-1 text-sm text-transparent ${PULSE_CLASS_NAME}`}
            >
              {chip}
            </span>
          </div>
        ))}
      </div>
      <p className="mb-4 text-sm">
        <Bars>{status}</Bars>
      </p>
      <div data-testid="product-list-skeleton" className="space-y-4 lg:space-y-2">
        {PRODUCT_ITEMS.map((item) => (
          <div key={item} className={`h-60 rounded-lg lg:h-10 ${PULSE_CLASS_NAME}`} />
        ))}
      </div>
    </>
  );
}

function Block({ block }: { block: SkeletonBlock }) {
  switch (block.kind) {
    case 'intro':
      return <Intro {...block} />;
    case 'keyFigures':
      return <KeyFigures {...block} />;
    case 'explorer':
      return <Explorer {...block} />;
    case 'productList':
      return <ProductList {...block} />;
  }
}

/** The data region of a category while it loads: its declared blocks, or nothing. */
export function CategoryDataSkeleton({ category }: { category: EcoCategory }) {
  const blocks = CATEGORY_SKELETONS[category];
  if (!blocks) {
    return null;
  }

  const isList = blocks.some(({ kind }) => kind === 'productList');
  return (
    <div
      data-testid="category-data-skeleton"
      aria-hidden="true"
      className="mt-8 flex w-full justify-center"
    >
      <div className={`w-full pb-12 sm:px-4 ${isList ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {blocks.map((block) => (
          <Block key={block.kind} block={block} />
        ))}
      </div>
    </div>
  );
}

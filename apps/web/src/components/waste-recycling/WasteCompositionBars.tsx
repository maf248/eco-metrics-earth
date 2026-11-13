'use client';

import {
  buildCompositionBarsOption,
  compositionBarsHeights,
  hasComposition,
} from '@/lib/wasteChartOption';
import { WASTE_COMPOSITION_GROUPS, WASTE_COMPOSITION_LABELS } from '@/lib/wasteMeasures';
import type { WasteCountry } from '@eco-metrics/shared';

import { WasteGroupBars } from './WasteGroupBars';

interface WasteCompositionBarsProps {
  /** The selected countries; those without composition data are listed below the chart. */
  countries: readonly WasteCountry[];
}

const TITLE = 'What the waste is made of (share of municipal waste)';

export function WasteCompositionBars({ countries }: Readonly<WasteCompositionBarsProps>) {
  const withComposition = countries.filter(hasComposition);
  const without = countries.filter((country) => !hasComposition(country));
  const noData = without.length > 0 && (
    <p data-testid="waste-no-composition" className="mt-3 text-sm text-fg-secondary">
      No composition data: {without.map(({ name }) => name).join(', ')}.
    </p>
  );

  if (withComposition.length === 0) {
    return (
      <>
        <h3 className="mb-2 mt-8 text-base font-semibold leading-snug text-fg sm:text-lg">
          {TITLE}
        </h3>
        {noData}
      </>
    );
  }

  return (
    <WasteGroupBars
      title={TITLE}
      titleClassName="mt-8"
      option={buildCompositionBarsOption(withComposition)}
      palette="wasteComposition"
      heights={compositionBarsHeights(withComposition.length)}
      table={{
        caption: 'What the waste of the selected countries is made of',
        srLabel: 'what the waste is made of',
        columns: WASTE_COMPOSITION_GROUPS.map((group) => WASTE_COMPOSITION_LABELS[group]),
        rows: withComposition.map(({ code, name, composition }) => ({
          code,
          name,
          year: composition.year,
          shares: WASTE_COMPOSITION_GROUPS.map((group) => composition.shares[group]),
        })),
      }}
    >
      {noData}
    </WasteGroupBars>
  );
}

'use client';

import {
  buildTreatmentBarsOption,
  hasTreatment,
  treatmentBarsHeights,
} from '@/lib/wasteChartOption';
import { WASTE_TREATMENT_GROUPS, WASTE_TREATMENT_LABELS } from '@/lib/wasteMeasures';
import type { WasteCountry } from '@eco-metrics/shared';

import { WasteGroupBars } from './WasteGroupBars';

interface WasteTreatmentBarsProps {
  /** The selected countries; those without treatment data are left out. */
  countries: readonly WasteCountry[];
}

export function WasteTreatmentBars({ countries }: Readonly<WasteTreatmentBarsProps>) {
  const treated = countries.filter(hasTreatment);
  if (treated.length === 0) {
    return <p className="mt-6 text-fg-secondary">Select a country to compare.</p>;
  }

  return (
    <WasteGroupBars
      title="What happens to the waste (share of municipal waste)"
      titleClassName="mt-6"
      option={buildTreatmentBarsOption(treated)}
      palette="wasteTreatment"
      heights={treatmentBarsHeights(treated.length)}
      table={{
        caption: 'What happens to the waste of the selected countries',
        srLabel: 'what happens to the waste',
        columns: WASTE_TREATMENT_GROUPS.map((group) => WASTE_TREATMENT_LABELS[group]),
        rows: treated.map(({ code, name, treatment }) => ({
          code,
          name,
          year: treatment.year,
          shares: WASTE_TREATMENT_GROUPS.map((group) => treatment.shares[group]),
        })),
      }}
    />
  );
}

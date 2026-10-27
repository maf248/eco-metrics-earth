import { ENERGY_SOURCE_LABELS, generationAt, latestYear, sharesOf } from '@/lib/energyMix';
import { formatShare, formatTwh } from '@/lib/formatNumber';
import { ENERGY_SOURCE_IDS } from '@eco-metrics/shared';
import type { EnergySourcesData, EnergySourcesEntity } from '@eco-metrics/shared';

interface EnergyLatestTableProps {
  entity: EnergySourcesEntity;
  data: Pick<EnergySourcesData, 'startYear'>;
}

const EMPTY_CELL = '—';

/**
 * The text equivalent of the donut: the entity's latest year, one row per
 * source. Small, so it is visible rather than collapsed, and it doubles as the
 * donut's legend with values.
 */
export function EnergyLatestTable({ entity, data: { startYear } }: EnergyLatestTableProps) {
  const year = latestYear(entity, startYear);
  if (year === undefined) {
    return null;
  }
  const generation = generationAt(entity.generation, year - startYear);
  const shares = sharesOf(generation);

  return (
    <div className="mt-4 overflow-x-auto" data-testid="energy-latest-table">
      <table className="w-full border-collapse text-sm tabular-nums">
        <caption className="px-3 py-2 text-left font-medium text-fg">
          {entity.name}: electricity mix in {year}
        </caption>
        <thead>
          <tr className="border-b border-line-strong text-fg">
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              Source
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Share (%)
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Generation (TWh)
            </th>
          </tr>
        </thead>
        <tbody>
          {ENERGY_SOURCE_IDS.map((id) => {
            const share = shares[id];
            const twh = generation[id];
            return (
              <tr key={id} className="border-b border-line-subtle last:border-b-0">
                <th scope="row" className="px-3 py-2 text-left font-medium text-fg">
                  {ENERGY_SOURCE_LABELS[id]}
                </th>
                <td className="px-3 py-2 text-right text-fg-body">
                  {share === null ? EMPTY_CELL : formatShare(share)}
                </td>
                <td className="px-3 py-2 text-right text-fg-body">
                  {twh === null ? EMPTY_CELL : formatTwh(twh)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

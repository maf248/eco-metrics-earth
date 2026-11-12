import type { WasteRecyclingData } from '@eco-metrics/shared';

interface WasteKeyFiguresProps {
  data: WasteRecyclingData;
}

const billions = (tonnes: number): string => (tonnes / 1e9).toFixed(2);

/**
 * The recycled share covers only the countries that report recycling: the others are not
 * counted as zero.
 */
export function WasteKeyFigures({ data: { world } }: Readonly<WasteKeyFiguresProps>) {
  const { generation, recycling } = world;

  return (
    <div data-testid="waste-key-figures">
      <p className="text-xl leading-relaxed text-fg-body sm:text-2xl">
        In 2022 the world generated{' '}
        <strong className="whitespace-nowrap font-bold text-fg">
          {billions(generation.tonnes2022)} billion tonnes
        </strong>{' '}
        of municipal waste,{' '}
        <strong className="whitespace-nowrap font-bold text-fg">
          {generation.kgPerPersonPerDay2022.toFixed(2)} kg
        </strong>{' '}
        per person per day.
      </p>
      <p className="mt-2 text-lg leading-relaxed text-fg-body sm:text-xl">
        By 2050 it is projected to reach{' '}
        <strong className="whitespace-nowrap font-bold text-fg">
          {billions(generation.tonnes2050)} billion tonnes
        </strong>
        {'.'}
      </p>
      <p className="mt-2 text-lg leading-relaxed text-fg-body sm:text-xl">
        Among the {recycling.countries} countries that report recycling, home to about{' '}
        {Math.round(recycling.populationSharePercent)}% of the world&rsquo;s population, about{' '}
        <strong className="whitespace-nowrap font-bold text-fg">
          {Math.round(recycling.sharePercent)}%
        </strong>{' '}
        of municipal waste is recycled.
      </p>
    </div>
  );
}

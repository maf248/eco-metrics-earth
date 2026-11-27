import { buildForestKeyFigures } from '@/lib/deforestationKeyFigures';
import type { ForestAreaData } from '@eco-metrics/shared';

interface ForestKeyFiguresProps {
  data: ForestAreaData;
}

/**
 * Server-rendered headline of the World's net change in forest area and its share of the
 * world's land, derived from the same payload as the explorer. Plain text, so it is indexable
 * and readable without JavaScript; nothing is rendered when the World lacks a value.
 */
export function ForestKeyFigures({ data }: ForestKeyFiguresProps) {
  const segments = buildForestKeyFigures(data);
  if (!segments) {
    return null;
  }

  return (
    <p
      data-testid="forest-key-figures"
      className="text-xl leading-relaxed text-fg-body sm:text-2xl"
    >
      {segments.map(({ text, strong }) =>
        strong ? (
          <strong key={text} className="whitespace-nowrap font-bold text-fg">
            {text}
          </strong>
        ) : (
          text
        ),
      )}
    </p>
  );
}

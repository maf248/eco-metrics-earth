import { LINK_CLASS_NAME } from '@/lib/linkClassName';
import type { DataSourcePublisher } from '@eco-metrics/shared';

interface SourceAttributionProps {
  /** A full `DataSourceAttribution` is assignable. */
  source: DataSourcePublisher;
}

/** A publisher's name as an external link, followed by its license. */
export function SourceAttribution({
  source: { provider, license, sourceUrl },
}: SourceAttributionProps) {
  return (
    <>
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className={LINK_CLASS_NAME}>
        {provider}
      </a>{' '}
      ({license})
    </>
  );
}

SourceAttribution.displayName = 'SourceAttribution';

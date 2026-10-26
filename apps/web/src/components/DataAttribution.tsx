import Link from 'next/link';
import type { ReactNode } from 'react';

import { SourceAttribution } from '@/components/SourceAttribution';
import { formatUtcDate } from '@/lib/formatUtcDate';
import { LINK_CLASS_NAME } from '@/lib/linkClassName';
import type { ApiResponseMeta } from '@eco-metrics/shared';

interface DataAttributionProps {
  testId: string;
  meta: ApiResponseMeta;
  /** An upstream credit the source's licence asks for, shown before the "All data sources" link. */
  extra?: ReactNode;
}

/**
 * The compact "Data: ..." line under a chart. Publisher, license and date come from
 * the API response, never from literals; the dataset identity and the upstream
 * citation live on `/data-sources/` and in the structured data.
 */
export function DataAttribution({ testId, meta, extra }: DataAttributionProps) {
  const { lastUpdated } = meta.source;

  return (
    <p className="mt-4 text-sm text-fg-muted" data-testid={testId}>
      Data: <SourceAttribution source={meta.source} />, updated{' '}
      <time dateTime={lastUpdated}>{formatUtcDate(lastUpdated)}</time>.{' '}
      {extra ? <>{extra} </> : null}
      <Link href="/data-sources/" className={LINK_CLASS_NAME}>
        All data sources
      </Link>
    </p>
  );
}

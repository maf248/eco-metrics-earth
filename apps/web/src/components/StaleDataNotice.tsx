import { WarningIcon } from '@/components/icons';
import { formatUtcDate } from '@/lib/formatUtcDate';

interface StaleDataNoticeProps {
  /** Name of the unreachable provider, from the payload's `meta.source.provider`. */
  providerName: string;
  /** ISO 8601 time of the last successful provider fetch of the data being shown. */
  fetchedAt: string;
}

/**
 * Banner above a section whose data comes from a stored snapshot older than the
 * silent threshold. Informational (`role="status"`), never an error, no controls.
 */
export function StaleDataNotice({ providerName, fetchedAt }: StaleDataNoticeProps) {
  return (
    <div
      role="status"
      data-testid="stale-data-notice"
      className="mt-8 flex w-full max-w-4xl items-start gap-3 rounded-lg border border-warning-line bg-warning-surface px-4 py-3 text-warning-fg"
    >
      <WarningIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm">
        {providerName} is currently unreachable. Showing the copy we retrieved on{' '}
        <time dateTime={fetchedAt}>{formatUtcDate(fetchedAt)}</time>.
      </p>
    </div>
  );
}

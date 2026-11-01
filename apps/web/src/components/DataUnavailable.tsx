import { WarningIcon } from '@/components/icons';
import { formatUtcDate } from '@/lib/formatUtcDate';

interface DataUnavailableProps {
  /** Name of the unreachable provider. */
  providerName: string;
  /** ISO 8601 time of the last successful provider fetch, only when a snapshot date is known. */
  lastRetrievedAt?: string;
}

/**
 * Replaces a section's content when its provider is down and no usable data exists.
 * Neutral panel with the warning icon (not an error red); `role="status"`, not
 * `alert`, and no retry control: ISR retries server-side.
 */
export function DataUnavailable({ providerName, lastRetrievedAt }: DataUnavailableProps) {
  return (
    <div
      role="status"
      data-testid="data-unavailable"
      className="mt-8 flex w-full max-w-4xl flex-col items-center gap-3 rounded-2xl border border-line-strong bg-surface-raised px-6 py-10 text-center"
    >
      <WarningIcon className="h-10 w-10 text-warning-fg" />
      <h2 className="text-xl font-semibold text-fg">Data temporarily unavailable</h2>
      <p className="max-w-prose text-fg-body">
        We couldn&apos;t reach {providerName} to load this data. We&apos;re keeping an eye on it and
        it should be back soon.
      </p>
      {lastRetrievedAt ? (
        <p className="text-sm text-fg-muted">
          Last retrieved from {providerName}:{' '}
          <time dateTime={lastRetrievedAt}>{formatUtcDate(lastRetrievedAt)}</time>
        </p>
      ) : null}
    </div>
  );
}

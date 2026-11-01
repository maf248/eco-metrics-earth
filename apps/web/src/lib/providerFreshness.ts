import type { ApiResponseMeta } from '@eco-metrics/shared';

/** Age limits, in days, of a stored snapshot served while its provider is down. */
export interface FreshnessThresholds {
  /** Up to this age the data is shown as usual, with no notice. */
  silentDays: number;
  /** Up to this age the data is shown under a stale notice; beyond it, it counts as unavailable. */
  noticeDays: number;
}

export const DEFAULT_FRESHNESS_THRESHOLDS: FreshnessThresholds = {
  silentDays: 7,
  noticeDays: 30,
};

export type Freshness =
  | { kind: 'fresh' }
  | { kind: 'stale-notice'; fetchedAt: string }
  | { kind: 'unavailable'; fetchedAt?: string };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function assertValidThresholds({ silentDays, noticeDays }: FreshnessThresholds): void {
  const valid =
    Number.isFinite(silentDays) &&
    Number.isFinite(noticeDays) &&
    silentDays >= 0 &&
    silentDays < noticeDays;
  if (!valid) {
    throw new Error(
      `Invalid freshness thresholds (silentDays ${silentDays}, noticeDays ${noticeDays}): ` +
        'they must satisfy 0 <= silentDays < noticeDays.',
    );
  }
}

/**
 * What a page should show for a provider-backed payload. Only a stale snapshot
 * (`meta.stale: true`) is judged by age; a `meta` without the flag is fresh whatever
 * its `fetchedAt` says, which also covers payloads cached before the flag existed.
 * Boundaries are inclusive: exactly `silentDays` is still fresh and exactly
 * `noticeDays` still shows the notice. A `fetchedAt` in the future (clock skew)
 * counts as age 0; an unparseable one cannot be trusted and counts as unavailable.
 */
export function evaluateFreshness(
  meta: Pick<ApiResponseMeta, 'fetchedAt' | 'stale'>,
  now: Date,
  thresholds: FreshnessThresholds = DEFAULT_FRESHNESS_THRESHOLDS,
): Freshness {
  assertValidThresholds(thresholds);

  if (meta.stale !== true) {
    return { kind: 'fresh' };
  }

  const fetchedAtMs = Date.parse(meta.fetchedAt);
  if (Number.isNaN(fetchedAtMs)) {
    return { kind: 'unavailable' };
  }

  const ageMs = Math.max(0, now.getTime() - fetchedAtMs);
  if (ageMs <= thresholds.silentDays * MS_PER_DAY) {
    return { kind: 'fresh' };
  }
  if (ageMs <= thresholds.noticeDays * MS_PER_DAY) {
    return { kind: 'stale-notice', fetchedAt: meta.fetchedAt };
  }
  return { kind: 'unavailable', fetchedAt: meta.fetchedAt };
}

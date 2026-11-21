/** Admission window for the shared `provider-unavailable` group: 6 hours. */
export const PROVIDER_GROUP_WINDOW_MS = 6 * 60 * 60 * 1000;
/** Admission window for every other event group: 5 minutes. */
export const DEFAULT_GROUP_WINDOW_MS = 5 * 60 * 1000;

/** Longest group key kept; longer keys (e.g. huge error messages) are truncated. */
export const MAX_GROUP_KEY_LENGTH = 200;
/** Most groups tracked at once; the oldest admitted is evicted when full. */
export const MAX_TRACKED_GROUPS = 500;

/**
 * In-memory throttle that keeps the Sentry monthly quota safe: a group is admitted at most once
 * per window. The state resets on a cold start, which is accepted (a few extra events at most).
 */
export class SentryThrottle {
  private readonly lastAdmitted = new Map<string, { at: number; windowMs: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  /** Returns whether a capture for `group` may be sent, and records it when it may. */
  admit(rawGroup: string, windowMs: number): boolean {
    const group = rawGroup.slice(0, MAX_GROUP_KEY_LENGTH);
    const current = this.now();

    for (const [key, entry] of this.lastAdmitted) {
      if (current - entry.at >= entry.windowMs) {
        this.lastAdmitted.delete(key);
      }
    }

    if (this.lastAdmitted.has(group)) {
      return false;
    }

    if (this.lastAdmitted.size >= MAX_TRACKED_GROUPS) {
      // Maps iterate in insertion order, so the first key is the oldest admitted group.
      const oldest = this.lastAdmitted.keys().next();
      if (!oldest.done) {
        this.lastAdmitted.delete(oldest.value);
      }
    }

    this.lastAdmitted.set(group, { at: current, windowMs });
    return true;
  }

  /** Number of groups currently inside their window (for tests). */
  get size(): number {
    return this.lastAdmitted.size;
  }
}

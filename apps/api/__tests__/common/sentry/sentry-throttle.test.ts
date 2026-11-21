import {
  DEFAULT_GROUP_WINDOW_MS,
  MAX_GROUP_KEY_LENGTH,
  MAX_TRACKED_GROUPS,
  PROVIDER_GROUP_WINDOW_MS,
  SentryThrottle,
} from '../../../src/common/sentry/sentry-throttle';

const MINUTE_MS = 60 * 1000;

describe('SentryThrottle', () => {
  let current: number;
  let throttle: SentryThrottle;

  beforeEach(() => {
    current = 1_000_000;
    throttle = new SentryThrottle(() => current);
  });

  it('should admit the provider group at T, suppress it at T + 10 minutes and admit it at T + 6 hours', () => {
    expect(throttle.admit('provider-unavailable', PROVIDER_GROUP_WINDOW_MS)).toBe(true);

    current += 10 * MINUTE_MS;
    expect(throttle.admit('provider-unavailable', PROVIDER_GROUP_WINDOW_MS)).toBe(false);

    current += PROVIDER_GROUP_WINDOW_MS - 10 * MINUTE_MS;
    expect(throttle.admit('provider-unavailable', PROVIDER_GROUP_WINDOW_MS)).toBe(true);
  });

  it('should admit distinct groups and suppress a repeat within the window', () => {
    expect(throttle.admit('Error: first', DEFAULT_GROUP_WINDOW_MS)).toBe(true);
    expect(throttle.admit('Error: second', DEFAULT_GROUP_WINDOW_MS)).toBe(true);

    current += MINUTE_MS;
    expect(throttle.admit('Error: first', DEFAULT_GROUP_WINDOW_MS)).toBe(false);
  });

  it('should admit a repeat at exactly 5 minutes', () => {
    expect(throttle.admit('Error: boom', DEFAULT_GROUP_WINDOW_MS)).toBe(true);

    current += DEFAULT_GROUP_WINDOW_MS - 1;
    expect(throttle.admit('Error: boom', DEFAULT_GROUP_WINDOW_MS)).toBe(false);

    current += 1;
    expect(throttle.admit('Error: boom', DEFAULT_GROUP_WINDOW_MS)).toBe(true);
  });

  it('should not restart the window when a capture is suppressed', () => {
    throttle.admit('Error: boom', DEFAULT_GROUP_WINDOW_MS);

    current += 4 * MINUTE_MS;
    expect(throttle.admit('Error: boom', DEFAULT_GROUP_WINDOW_MS)).toBe(false);

    current += MINUTE_MS;
    expect(throttle.admit('Error: boom', DEFAULT_GROUP_WINDOW_MS)).toBe(true);
  });

  it('should prune entries older than their window on each call', () => {
    throttle.admit('Error: a', DEFAULT_GROUP_WINDOW_MS);
    throttle.admit('Error: b', DEFAULT_GROUP_WINDOW_MS);
    throttle.admit('provider-unavailable', PROVIDER_GROUP_WINDOW_MS);
    expect(throttle.size).toBe(3);

    current += DEFAULT_GROUP_WINDOW_MS;
    throttle.admit('Error: c', DEFAULT_GROUP_WINDOW_MS);

    // a and b expired and were pruned; the provider group is still inside its 6 h window.
    expect(throttle.size).toBe(2);
  });

  it('should truncate long group keys so they share one entry', () => {
    const base = 'x'.repeat(MAX_GROUP_KEY_LENGTH);
    expect(throttle.admit(`${base}-first`, DEFAULT_GROUP_WINDOW_MS)).toBe(true);
    expect(throttle.admit(`${base}-second`, DEFAULT_GROUP_WINDOW_MS)).toBe(false);
    expect(throttle.size).toBe(1);
  });

  it('should cap the tracked groups and evict the oldest first', () => {
    for (let index = 0; index < MAX_TRACKED_GROUPS; index += 1) {
      throttle.admit(`Error: ${index}`, DEFAULT_GROUP_WINDOW_MS);
    }
    expect(throttle.size).toBe(MAX_TRACKED_GROUPS);

    expect(throttle.admit('Error: overflow', DEFAULT_GROUP_WINDOW_MS)).toBe(true);
    expect(throttle.size).toBe(MAX_TRACKED_GROUPS);

    // The oldest entry was evicted, so it is admitted again; a newer one is still suppressed.
    expect(throttle.admit('Error: 1', DEFAULT_GROUP_WINDOW_MS)).toBe(false);
    expect(throttle.admit('Error: 0', DEFAULT_GROUP_WINDOW_MS)).toBe(true);
  });

  it('should use the system clock by default', () => {
    const defaultThrottle = new SentryThrottle();
    expect(defaultThrottle.admit('Error: x', DEFAULT_GROUP_WINDOW_MS)).toBe(true);
    expect(defaultThrottle.admit('Error: x', DEFAULT_GROUP_WINDOW_MS)).toBe(false);
  });
});

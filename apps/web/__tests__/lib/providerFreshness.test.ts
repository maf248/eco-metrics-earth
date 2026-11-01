import { DEFAULT_FRESHNESS_THRESHOLDS, evaluateFreshness } from '@/lib/providerFreshness';

const NOW = new Date('2026-10-28T12:00:00.000Z');
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const ago = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();
const stale = (fetchedAt: string) => ({ stale: true, fetchedAt });

describe('DEFAULT_FRESHNESS_THRESHOLDS', () => {
  it('should be 7 days silent and 30 days with a notice', () => {
    expect(DEFAULT_FRESHNESS_THRESHOLDS).toEqual({ silentDays: 7, noticeDays: 30 });
  });
});

describe('evaluateFreshness', () => {
  it('should be fresh when stale is false, whatever the age', () => {
    expect(evaluateFreshness({ stale: false, fetchedAt: ago(90 * DAY_MS) }, NOW)).toEqual({
      kind: 'fresh',
    });
  });

  it('should be fresh for a legacy meta without the stale flag', () => {
    expect(evaluateFreshness({ fetchedAt: ago(90 * DAY_MS) }, NOW)).toEqual({ kind: 'fresh' });
  });

  it('should be fresh when stale for exactly 7 days', () => {
    expect(evaluateFreshness(stale(ago(7 * DAY_MS)), NOW)).toEqual({ kind: 'fresh' });
  });

  it('should show the notice from 7 days and 1 minute, carrying fetchedAt', () => {
    const fetchedAt = ago(7 * DAY_MS + MINUTE_MS);

    expect(evaluateFreshness(stale(fetchedAt), NOW)).toEqual({ kind: 'stale-notice', fetchedAt });
  });

  it('should still show the notice at exactly 30 days', () => {
    const fetchedAt = ago(30 * DAY_MS);

    expect(evaluateFreshness(stale(fetchedAt), NOW)).toEqual({ kind: 'stale-notice', fetchedAt });
  });

  it('should be unavailable beyond 30 days, carrying fetchedAt', () => {
    const fetchedAt = ago(30 * DAY_MS + MINUTE_MS);

    expect(evaluateFreshness(stale(fetchedAt), NOW)).toEqual({ kind: 'unavailable', fetchedAt });
  });

  it('should be unavailable without a date when fetchedAt cannot be parsed', () => {
    expect(evaluateFreshness(stale('not-a-date'), NOW)).toEqual({ kind: 'unavailable' });
  });

  it('should treat a fetchedAt in the future as age 0', () => {
    expect(evaluateFreshness(stale(ago(-60 * MINUTE_MS)), NOW)).toEqual({ kind: 'fresh' });
  });

  it('should apply a per-category override', () => {
    const fetchedAt = ago(2 * DAY_MS);

    expect(evaluateFreshness(stale(fetchedAt), NOW, { silentDays: 1, noticeDays: 3 })).toEqual({
      kind: 'stale-notice',
      fetchedAt,
    });
  });

  it.each([
    ['silentDays equal to noticeDays', { silentDays: 3, noticeDays: 3 }],
    ['silentDays above noticeDays', { silentDays: 5, noticeDays: 3 }],
    ['a negative silentDays', { silentDays: -1, noticeDays: 3 }],
    ['a non-finite noticeDays', { silentDays: 1, noticeDays: Number.POSITIVE_INFINITY }],
    ['a NaN silentDays', { silentDays: Number.NaN, noticeDays: 3 }],
  ])('should throw for %s', (_label, thresholds) => {
    expect(() => evaluateFreshness(stale(ago(DAY_MS)), NOW, thresholds)).toThrow(
      'Invalid freshness thresholds',
    );
  });

  it('should validate the thresholds even for a fresh payload', () => {
    expect(() =>
      evaluateFreshness({ fetchedAt: ago(0) }, NOW, { silentDays: 2, noticeDays: 1 }),
    ).toThrow('Invalid freshness thresholds');
  });

  it('should accept silentDays 0', () => {
    expect(
      evaluateFreshness(stale(ago(MINUTE_MS)), NOW, { silentDays: 0, noticeDays: 1 }).kind,
    ).toBe('stale-notice');
  });
});

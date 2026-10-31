import { createHash } from 'crypto';

import { Logger } from '@nestjs/common';

import { ProviderDataError, ProviderError } from '../../../src/common/errors/provider-error';
import {
  ProviderSnapshotService,
  SNAPSHOT_EMPTY_READ_TTL_MS,
  SNAPSHOT_FAILED_READ_RETRY_MS,
  SNAPSHOT_REFRESH_INTERVAL_MS,
  SNAPSHOT_STORE_TIMEOUT_MS,
  SNAPSHOT_WRITE_BACKOFF_MS,
} from '../../../src/common/snapshots/provider-snapshot.service';

import { StubSnapshotStore } from './stub-snapshot-store';

const NOW = new Date('2026-10-28T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const PAYLOAD = { data: { answer: 42 }, lastUpdated: '2026-10-27T00:00:00.000Z' };

function hashOf(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * HOUR_MS).toISOString();
}

function succeeding<T>(payload: T): jest.Mock<Promise<T>, []> {
  return jest.fn(() => Promise.resolve(payload));
}

function failing(error: Error = new ProviderError('provider down')): jest.Mock<Promise<never>, []> {
  return jest.fn(() => Promise.reject(error));
}

describe('ProviderSnapshotService', () => {
  let store: StubSnapshotStore;
  let service: ProviderSnapshotService;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    store = new StubSnapshotStore();
    service = new ProviderSnapshotService(store);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('a category opts in with one call', () => {
    it('should return the payload, the fetch time and the stale flag', async () => {
      const result = await service.resolve('my-category', succeeding(PAYLOAD));

      expect(result).toEqual({ payload: PAYLOAD, fetchedAt: NOW.toISOString(), stale: false });
    });

    it.each(['Bad Key!', '', 'UPPER', 'with/slash', 'snake_case'])(
      'should reject the key %j before any store or provider call',
      async (key) => {
        const load = succeeding(PAYLOAD);

        await expect(service.resolve(key, load)).rejects.toThrow('Invalid snapshot key');

        expect(load).not.toHaveBeenCalled();
        expect(store.calls).toEqual([]);
      },
    );
  });

  describe('a successful provider fetch', () => {
    it('should serve it fresh with the call time as fetchedAt', async () => {
      const result = await service.resolve('cat', succeeding(PAYLOAD));

      expect(result.stale).toBe(false);
      expect(result.fetchedAt).toBe(NOW.toISOString());
      expect(store.count('read')).toBe(0);
    });

    it('should serve the first payload as stale when a later load fails in the same instance', async () => {
      await service.resolve('cat', succeeding(PAYLOAD));
      jest.setSystemTime(new Date(NOW.getTime() + HOUR_MS));
      store.calls.length = 0;

      const result = await service.resolve('cat', failing());

      expect(result).toEqual({ payload: PAYLOAD, fetchedAt: NOW.toISOString(), stale: true });
      expect(store.count('read')).toBe(0);
    });
  });

  describe('write policy', () => {
    it('should stat once and write once when nothing is stored', async () => {
      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.count('stat')).toBe(1);
      expect(store.count('write')).toBe(1);
      expect(store.stored('cat')).toEqual({
        fetchedAt: NOW.toISOString(),
        contentHash: hashOf(PAYLOAD),
        payload: PAYLOAD,
      });
    });

    it('should not rewrite an unchanged snapshot fetched 2 hours ago', async () => {
      store.seed('cat', { fetchedAt: hoursAgo(2), contentHash: hashOf(PAYLOAD), payload: PAYLOAD });

      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.count('stat')).toBe(1);
      expect(store.count('write')).toBe(0);
    });

    it('should write when the stored hash differs', async () => {
      store.seed('cat', { fetchedAt: hoursAgo(2), contentHash: 'other', payload: {} });

      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.count('write')).toBe(1);
    });

    it('should refresh an unchanged snapshot stored 25 hours ago', async () => {
      store.seed('cat', {
        fetchedAt: hoursAgo(25),
        contentHash: hashOf(PAYLOAD),
        payload: PAYLOAD,
      });

      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.count('write')).toBe(1);
      expect(store.stored('cat')?.fetchedAt).toBe(NOW.toISOString());
    });

    it('should refresh an unchanged snapshot stored exactly 24 hours ago', async () => {
      store.seed('cat', {
        fetchedAt: new Date(NOW.getTime() - SNAPSHOT_REFRESH_INTERVAL_MS).toISOString(),
        contentHash: hashOf(PAYLOAD),
        payload: PAYLOAD,
      });

      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.count('write')).toBe(1);
    });

    it('should write when the stored fetchedAt cannot be parsed', async () => {
      store.seed('cat', { fetchedAt: 'garbage', contentHash: hashOf(PAYLOAD), payload: PAYLOAD });

      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.count('write')).toBe(1);
    });

    it('should cost nothing on repeated identical successes within 24 hours', async () => {
      await service.resolve('cat', succeeding(PAYLOAD));
      store.calls.length = 0;

      jest.setSystemTime(new Date(NOW.getTime() + 2 * HOUR_MS));
      await service.resolve('cat', succeeding(PAYLOAD));
      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.calls).toEqual([]);
    });

    it('should not stat again after a first success that skipped the write', async () => {
      store.seed('cat', { fetchedAt: hoursAgo(2), contentHash: hashOf(PAYLOAD), payload: PAYLOAD });
      await service.resolve('cat', succeeding(PAYLOAD));
      store.calls.length = 0;

      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.calls).toEqual([]);
    });

    it('should write a later change in the same process without a new stat', async () => {
      await service.resolve('cat', succeeding(PAYLOAD));
      store.calls.length = 0;
      const changed = { ...PAYLOAD, data: { answer: 43 } };

      await service.resolve('cat', succeeding(changed));

      expect(store.count('stat')).toBe(0);
      expect(store.count('write')).toBe(1);
      expect(store.stored('cat')?.payload).toEqual(changed);
    });

    it('should write again once 25 hours passed in the same process', async () => {
      await service.resolve('cat', succeeding(PAYLOAD));
      store.calls.length = 0;

      jest.setSystemTime(new Date(NOW.getTime() + 25 * HOUR_MS));
      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.count('stat')).toBe(0);
      expect(store.count('write')).toBe(1);
    });

    it('should track each key independently', async () => {
      await service.resolve('first', succeeding(PAYLOAD));
      await service.resolve('second', succeeding(PAYLOAD));

      expect(store.calls.map(({ operation, key }) => `${operation}:${key}`)).toEqual([
        'stat:first',
        'write:first',
        'stat:second',
        'write:second',
      ]);
    });

    it('should share one persistence attempt between concurrent successes of a key', async () => {
      await Promise.all([
        service.resolve('cat', succeeding(PAYLOAD)),
        service.resolve('cat', succeeding(PAYLOAD)),
        service.resolve('cat', succeeding(PAYLOAD)),
      ]);

      expect(store.count('stat')).toBe(1);
      expect(store.count('write')).toBe(1);
    });

    it('should never download a payload on the success path', async () => {
      store.seed('cat', { fetchedAt: hoursAgo(30), contentHash: 'other', payload: {} });

      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.count('read')).toBe(0);
    });
  });

  describe('read policy', () => {
    it('should serve the stored snapshot when the provider fails', async () => {
      const stored = { ...PAYLOAD, data: { answer: 7 } };
      store.seed('cat', { fetchedAt: hoursAgo(240), contentHash: hashOf(stored), payload: stored });

      const result = await service.resolve('cat', failing());

      expect(result).toEqual({ payload: stored, fetchedAt: hoursAgo(240), stale: true });
      expect(store.count('read')).toBe(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should serve a ProviderDataError the same way', async () => {
      store.seed('cat', { fetchedAt: hoursAgo(3), contentHash: 'h', payload: PAYLOAD });

      const result = await service.resolve('cat', failing(new ProviderDataError('no rows')));

      expect(result.stale).toBe(true);
    });

    it('should rethrow the original ProviderError when nothing is stored', async () => {
      const error = new ProviderError('provider down');

      await expect(service.resolve('cat', failing(error))).rejects.toBe(error);
    });

    it('should not read the store again after serving a stored snapshot', async () => {
      store.seed('cat', { fetchedAt: hoursAgo(3), contentHash: 'h', payload: PAYLOAD });
      await service.resolve('cat', failing());

      const second = await service.resolve('cat', failing());

      expect(second.payload).toEqual(PAYLOAD);
      expect(store.count('read')).toBe(1);
    });

    it('should never read on a healthy cold start', async () => {
      store.seed('cat', { fetchedAt: hoursAgo(3), contentHash: 'h', payload: {} });

      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.count('read')).toBe(0);
    });

    it('should rethrow a plain Error untouched without reading the store', async () => {
      store.seed('cat', { fetchedAt: hoursAgo(3), contentHash: 'h', payload: PAYLOAD });
      const bug = new TypeError('bug');

      await expect(service.resolve('cat', failing(bug))).rejects.toBe(bug);

      expect(store.count('read')).toBe(0);
    });
  });

  describe('nothing stored during an outage', () => {
    it('should read once, not on every failing request, when nothing is stored', async () => {
      for (let i = 0; i < 5; i += 1) {
        await expect(service.resolve('cat', failing())).rejects.toBeInstanceOf(ProviderError);
      }

      expect(store.count('read')).toBe(1);
    });

    it('should read again after the empty-read window', async () => {
      await service.resolve('cat', failing()).catch(() => undefined);
      jest.setSystemTime(new Date(NOW.getTime() + SNAPSHOT_EMPTY_READ_TTL_MS));
      store.seed('cat', { fetchedAt: hoursAgo(5), contentHash: 'h', payload: PAYLOAD });

      const result = await service.resolve('cat', failing());

      expect(result.stale).toBe(true);
      expect(store.count('read')).toBe(2);
    });

    it('should retry a failed read sooner than an empty one', async () => {
      store.failures.set('read', new Error('boom'));
      await service.resolve('cat', failing()).catch(() => undefined);
      await service.resolve('cat', failing()).catch(() => undefined);
      expect(store.count('read')).toBe(1);

      jest.setSystemTime(new Date(NOW.getTime() + SNAPSHOT_FAILED_READ_RETRY_MS));
      await service.resolve('cat', failing()).catch(() => undefined);

      expect(store.count('read')).toBe(2);
    });
  });

  describe('storage failures', () => {
    it('should swallow a write failure and return the fresh result with a warning', async () => {
      store.failures.set('write', new Error('403 forbidden'));

      const result = await service.resolve('cat', succeeding(PAYLOAD));

      expect(result).toEqual({ payload: PAYLOAD, fetchedAt: NOW.toISOString(), stale: false });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('write failed for "cat"'));
    });

    it('should cost one write per backoff window across many successes when writes fail', async () => {
      store.failures.set('write', new Error('403 forbidden'));

      for (let i = 0; i < 5; i += 1) {
        await service.resolve('cat', succeeding(PAYLOAD));
      }
      expect(store.count('write')).toBe(1);

      jest.setSystemTime(new Date(NOW.getTime() + SNAPSHOT_WRITE_BACKOFF_MS));
      for (let i = 0; i < 5; i += 1) {
        await service.resolve('cat', succeeding(PAYLOAD));
      }
      expect(store.count('write')).toBe(2);
    });

    it('should resume normal writing once a write succeeds after the backoff', async () => {
      store.failures.set('write', new Error('403 forbidden'));
      await service.resolve('cat', succeeding(PAYLOAD));
      store.failures.clear();
      jest.setSystemTime(new Date(NOW.getTime() + SNAPSHOT_WRITE_BACKOFF_MS));

      await service.resolve('cat', succeeding(PAYLOAD));
      await service.resolve('cat', succeeding(PAYLOAD));

      expect(store.count('write')).toBe(2);
      expect(store.stored('cat')?.payload).toEqual(PAYLOAD);
    });

    it.each(['reject', 'hang'] as const)(
      'should cost one stat per process when stat fails by %s',
      async (mode) => {
        if (mode === 'reject') {
          store.failures.set('stat', new Error('boom'));
        } else {
          store.hanging.add('stat');
        }

        for (let i = 0; i < 4; i += 1) {
          const pending = service.resolve('cat', succeeding({ ...PAYLOAD, data: { answer: i } }));
          await jest.advanceTimersByTimeAsync(SNAPSHOT_STORE_TIMEOUT_MS);
          await pending;
        }

        expect(store.count('stat')).toBe(1);
      },
    );

    it('should bound the response latency by a single timeout when the whole store hangs', async () => {
      store.hanging.add('stat');
      store.hanging.add('write');
      let settled = false;

      const pending = service.resolve('cat', succeeding(PAYLOAD)).then((result) => {
        settled = true;
        return result;
      });
      await jest.advanceTimersByTimeAsync(SNAPSHOT_STORE_TIMEOUT_MS);

      expect(settled).toBe(true);
      await expect(pending).resolves.toMatchObject({ payload: PAYLOAD, stale: false });
    });

    it('should swallow a stat failure and attempt the write as if nothing were stored', async () => {
      store.failures.set('stat', new Error('boom'));

      const result = await service.resolve('cat', succeeding(PAYLOAD));

      expect(result.stale).toBe(false);
      expect(store.count('write')).toBe(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('stat failed for "cat"'));
    });

    it('should rethrow the ProviderError and warn when the read fails', async () => {
      store.failures.set('read', new Error('boom'));
      const error = new ProviderError('provider down');

      await expect(service.resolve('cat', failing(error))).rejects.toBe(error);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('read failed for "cat"'));
    });

    it('should log a non-Error rejection as text', async () => {
      store.write = () => Promise.reject('plain string');

      await service.resolve('cat', succeeding(PAYLOAD));

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('plain string'));
    });

    it('should never log the payload', async () => {
      store.failEverything();
      const secret = { data: { token: 'do-not-log-me' }, lastUpdated: 'x' };

      await service.resolve('cat', succeeding(secret));
      await service.resolve('other', failing()).catch(() => undefined);

      for (const [message] of warnSpy.mock.calls) {
        expect(String(message)).not.toContain('do-not-log-me');
      }
    });

    it.each(['stat', 'write'] as const)(
      'should continue after the timeout when %s never settles',
      async (operation) => {
        store.hanging.add(operation);

        const pending = service.resolve('cat', succeeding(PAYLOAD));
        await jest.advanceTimersByTimeAsync(SNAPSHOT_STORE_TIMEOUT_MS);

        await expect(pending).resolves.toMatchObject({ payload: PAYLOAD, stale: false });
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('timed out'));
      },
    );

    it('should rethrow the ProviderError after the timeout when read never settles', async () => {
      store.hanging.add('read');
      const error = new ProviderError('provider down');

      const pending = service.resolve('cat', failing(error));
      const assertion = expect(pending).rejects.toBe(error);
      await jest.advanceTimersByTimeAsync(SNAPSHOT_STORE_TIMEOUT_MS);

      await assertion;
    });
  });
});

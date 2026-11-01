import { createHash } from 'crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { ProviderError } from '../errors/provider-error';

import { SNAPSHOT_STORE, type SnapshotStore } from './snapshot-store';

/** A stored snapshot is rewritten at most this often when its content did not change. */
export const SNAPSHOT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Upper bound of every store call: a slow bucket must never hold a response hostage. */
export const SNAPSHOT_STORE_TIMEOUT_MS = 5_000;

/**
 * After a failed write, a key is not written again for this long: a 403 or an
 * outage must not cost an operation per response.
 */
export const SNAPSHOT_WRITE_BACKOFF_MS = 60 * 60 * 1000;

/**
 * How long "nothing stored" is remembered after a provider failure, so an outage
 * costs one read, not one per request.
 */
export const SNAPSHOT_EMPTY_READ_TTL_MS = 60 * 60 * 1000;

/** A failed or timed-out read is retried sooner than an authoritative "nothing stored". */
export const SNAPSHOT_FAILED_READ_RETRY_MS = 60 * 1000;

const KEY_PATTERN = /^[a-z0-9-]+$/;

export interface Snapshotted<T> {
  payload: T;
  /** ISO 8601 time of the last successful provider fetch of `payload`. */
  fetchedAt: string;
  /** `true` when `payload` is a stored last-known-good value served because the provider failed. */
  stale: boolean;
}

interface LastGood {
  payload: unknown;
  fetchedAt: string;
}

interface Persisted {
  hash: string;
  /** Epoch ms of the stored snapshot's `fetchedAt`. */
  at: number;
}

type Guarded<T> = { ok: true; value: T } | { ok: false };

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * The only thing a provider-backed category needs to survive a provider outage:
 * `resolve(key, load)` runs the category's assembly and serves its result, or,
 * when the provider fails, the last good payload (in memory first, then the
 * store). It decides when the store is written (content changed or older than
 * 24 h) so the bucket stays inside the free tier, and no store failure ever
 * changes the outcome of a successful load.
 */
@Injectable()
export class ProviderSnapshotService {
  private readonly logger = new Logger(ProviderSnapshotService.name);
  private readonly lastGood = new Map<string, LastGood>();
  private readonly lastPersisted = new Map<string, Persisted>();
  private readonly writesInFlight = new Map<string, Promise<void>>();
  /** Keys whose first-success `stat` was attempted, whatever its outcome. */
  private readonly statAttempted = new Set<string>();
  /** Epoch ms before which a key is not written again after a failed write. */
  private readonly writeBackoffUntil = new Map<string, number>();
  /** Epoch ms before which a key is not read again after a read found nothing or failed. */
  private readonly readSkipUntil = new Map<string, number>();

  constructor(@Inject(SNAPSHOT_STORE) private readonly store: SnapshotStore) {}

  // `key` must come from a fixed set of developer constants (one per category):
  // per-key state is never evicted.
  async resolve<T>(key: string, load: () => Promise<T>): Promise<Snapshotted<T>> {
    if (!KEY_PATTERN.test(key)) {
      throw new Error(
        `Invalid snapshot key "${key}". Key must be a non-empty lowercase kebab string.`,
      );
    }

    let payload: T;
    try {
      payload = await load();
    } catch (error) {
      // A plain Error is a bug, not an outage: it must stay a 500 and never be masked.
      if (!(error instanceof ProviderError)) {
        throw error;
      }
      const snapshot = await this.recover<T>(key);
      if (snapshot === undefined) {
        throw error;
      }
      this.logger.warn(
        `Provider failed for "${key}" (${describeError(error)}); serving the snapshot from ${snapshot.fetchedAt}`,
      );

      return { payload: snapshot.payload, fetchedAt: snapshot.fetchedAt, stale: true };
    }

    const fetchedAt = new Date();
    const fetchedAtIso = fetchedAt.toISOString();
    this.lastGood.set(key, { payload, fetchedAt: fetchedAtIso });
    await this.persist(key, payload, fetchedAt);

    return { payload, fetchedAt: fetchedAtIso, stale: false };
  }

  /** In-memory last good value first; otherwise one store read, remembered if found. */
  private async recover<T>(key: string): Promise<{ payload: T; fetchedAt: string } | undefined> {
    const remembered = this.lastGood.get(key);
    if (remembered !== undefined) {
      return { payload: remembered.payload as T, fetchedAt: remembered.fetchedAt };
    }

    if (Date.now() < (this.readSkipUntil.get(key) ?? 0)) {
      return undefined;
    }

    const read = await this.guard(key, 'read', () => this.store.read<T>(key));
    if (!read.ok || read.value === undefined) {
      const retryAfter = read.ok ? SNAPSHOT_EMPTY_READ_TTL_MS : SNAPSHOT_FAILED_READ_RETRY_MS;
      this.readSkipUntil.set(key, Date.now() + retryAfter);
      return undefined;
    }
    const { payload, fetchedAt } = read.value;
    this.lastGood.set(key, { payload, fetchedAt });

    return { payload, fetchedAt };
  }

  /**
   * Concurrent successes of one key share a single persistence attempt. A payload that
   * arrives while one is in flight is not written by it: the next success persists the
   * newer content (the hash differs), so nothing is lost beyond one request's delay.
   * The whole step is bounded by a single timeout, so a hung bucket delays a response
   * by at most `SNAPSHOT_STORE_TIMEOUT_MS`, however many calls the policy would make.
   */
  private async persist(key: string, payload: unknown, fetchedAt: Date): Promise<void> {
    let task = this.writesInFlight.get(key);
    if (task === undefined) {
      task = this.persistNow(key, payload, fetchedAt).finally(() => {
        this.writesInFlight.delete(key);
      });
      this.writesInFlight.set(key, task);
    }

    try {
      await this.withTimeout(task);
    } catch (error) {
      this.logger.warn(`Snapshot persistence for "${key}" gave up: ${describeError(error)}`);
    }
  }

  private async persistNow(key: string, payload: unknown, fetchedAt: Date): Promise<void> {
    // Assembly is deterministic, so equal content gives an equal hash.
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const now = fetchedAt.getTime();

    let persisted = this.lastPersisted.get(key);
    if (persisted === undefined && !this.statAttempted.has(key)) {
      // First success of this key in this process: one metadata-only request decides
      // whether a cold start has to write at all. It is attempted once per process
      // whatever its outcome, so a failing or hung `stat` never repeats.
      this.statAttempted.add(key);
      const stat = await this.guard(key, 'stat', () => this.store.stat(key));
      if (stat.ok && stat.value !== undefined) {
        persisted = { hash: stat.value.contentHash, at: Date.parse(stat.value.fetchedAt) };
      }
    }

    // An unparseable stored time is NaN, which is never "recent": it forces a write.
    if (
      persisted !== undefined &&
      persisted.hash === hash &&
      now - persisted.at < SNAPSHOT_REFRESH_INTERVAL_MS
    ) {
      this.lastPersisted.set(key, persisted);
      return;
    }

    if (Date.now() < (this.writeBackoffUntil.get(key) ?? 0)) {
      return;
    }

    const written = await this.guard(key, 'write', () =>
      this.store.write(key, { fetchedAt: fetchedAt.toISOString(), contentHash: hash, payload }),
    );
    if (written.ok) {
      this.lastPersisted.set(key, { hash, at: now });
      this.writeBackoffUntil.delete(key);
    } else {
      this.writeBackoffUntil.set(key, Date.now() + SNAPSHOT_WRITE_BACKOFF_MS);
    }
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`timed out after ${SNAPSHOT_STORE_TIMEOUT_MS} ms`)),
          SNAPSHOT_STORE_TIMEOUT_MS,
        );
      });

      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Runs a store call with a timeout and turns any failure into a warning and `{ ok: false }`. */
  private async guard<T>(
    key: string,
    operation: 'stat' | 'read' | 'write',
    call: () => Promise<T>,
  ): Promise<Guarded<T>> {
    try {
      return { ok: true, value: await this.withTimeout(call()) };
    } catch (error) {
      this.logger.warn(`Snapshot store ${operation} failed for "${key}": ${describeError(error)}`);

      return { ok: false };
    }
  }
}

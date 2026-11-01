import type {
  SnapshotStat,
  SnapshotStore,
  StoredSnapshot,
} from '../../../src/common/snapshots/snapshot-store';

export type StoreOperation = 'stat' | 'read' | 'write';

/**
 * In-memory `SnapshotStore` for tests: records every call, can hold seeded
 * snapshots and can be told to reject or never settle per operation.
 */
export class StubSnapshotStore implements SnapshotStore {
  readonly calls: { operation: StoreOperation; key: string }[] = [];
  readonly failures = new Map<StoreOperation, Error>();
  readonly hanging = new Set<StoreOperation>();
  private readonly snapshots = new Map<string, StoredSnapshot<unknown>>();

  seed<T>(key: string, snapshot: StoredSnapshot<T>): this {
    this.snapshots.set(key, snapshot);
    return this;
  }

  /** Makes every operation reject, like a bucket with a missing IAM binding. */
  failEverything(error: Error = new Error('storage unavailable')): this {
    for (const operation of ['stat', 'read', 'write'] as const) {
      this.failures.set(operation, error);
    }
    return this;
  }

  stored(key: string): StoredSnapshot<unknown> | undefined {
    return this.snapshots.get(key);
  }

  count(operation: StoreOperation): number {
    return this.calls.filter((call) => call.operation === operation).length;
  }

  stat(key: string): Promise<SnapshotStat | undefined> {
    return this.run('stat', key, () => {
      const snapshot = this.snapshots.get(key);
      return snapshot && { fetchedAt: snapshot.fetchedAt, contentHash: snapshot.contentHash };
    });
  }

  read<T>(key: string): Promise<StoredSnapshot<T> | undefined> {
    return this.run('read', key, () => this.snapshots.get(key) as StoredSnapshot<T> | undefined);
  }

  write<T>(key: string, snapshot: StoredSnapshot<T>): Promise<void> {
    return this.run('write', key, () => {
      this.snapshots.set(key, snapshot);
    });
  }

  private run<R>(operation: StoreOperation, key: string, action: () => R): Promise<R> {
    this.calls.push({ operation, key });
    if (this.hanging.has(operation)) {
      return new Promise<R>(() => undefined);
    }
    const failure = this.failures.get(operation);
    if (failure) {
      return Promise.reject(failure);
    }
    return Promise.resolve(action());
  }
}

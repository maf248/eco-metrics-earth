import type { SnapshotStat, SnapshotStore, StoredSnapshot } from './snapshot-store';

/** No-op store used when persistence is not configured: nothing is ever stored or read. */
export class DisabledSnapshotStore implements SnapshotStore {
  stat(): Promise<SnapshotStat | undefined> {
    return Promise.resolve(undefined);
  }

  read<T>(): Promise<StoredSnapshot<T> | undefined> {
    return Promise.resolve(undefined);
  }

  write(): Promise<void> {
    return Promise.resolve();
  }
}

/** Injection token of the snapshot persistence port. */
export const SNAPSHOT_STORE = Symbol('SNAPSHOT_STORE');

/** A persisted last-known-good payload together with when and what it was. */
export interface StoredSnapshot<T> {
  /** ISO 8601 time of the provider fetch that produced the payload. */
  fetchedAt: string;
  /** SHA-256 (hex) of `JSON.stringify(payload)`. */
  contentHash: string;
  payload: T;
}

/** What `stat` knows about a stored snapshot, without its payload. */
export interface SnapshotStat {
  fetchedAt: string;
  contentHash: string;
}

/**
 * Persistence port for provider snapshots. The store applies its own namespace
 * (for example the environment prefix); callers pass a kebab-case `key`, by
 * convention the category slug.
 */
export interface SnapshotStore {
  /** Metadata only: never downloads the payload. Resolves `undefined` when nothing is stored. */
  stat(key: string): Promise<SnapshotStat | undefined>;
  /** Downloads the stored snapshot. Resolves `undefined` when nothing usable is stored. */
  read<T>(key: string): Promise<StoredSnapshot<T> | undefined>;
  write<T>(key: string, snapshot: StoredSnapshot<T>): Promise<void>;
}

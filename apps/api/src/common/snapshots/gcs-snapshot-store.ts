import { Storage } from '@google-cloud/storage';
import { Logger } from '@nestjs/common';

import type { SnapshotStat, SnapshotStore, StoredSnapshot } from './snapshot-store';

/** The slice of a GCS file the store uses; lets tests inject a stub without GCP. */
export interface GcsFileLike {
  getMetadata(): Promise<[{ metadata?: Record<string, unknown> }, ...unknown[]]>;
  download(): Promise<[Buffer, ...unknown[]]>;
  save(
    data: string,
    options: {
      contentType: string;
      resumable: boolean;
      metadata: { metadata: Record<string, string> };
    },
  ): Promise<void>;
}

/** The slice of a GCS bucket the store uses. */
export interface GcsBucketLike {
  file(name: string): GcsFileLike;
}

export interface GcsSnapshotStoreOptions {
  bucket: string;
  /** Object name prefix, one per environment (`production`, `development`). */
  prefix: string;
  /** Overrides how the bucket handle is created. Defaults to the real client (ADC only). */
  createBucket?: (bucket: string) => GcsBucketLike;
}

const RETRY_OPTIONS = { maxRetries: 2, totalTimeout: 10 } as const;

function createDefaultBucket(bucket: string): GcsBucketLike {
  // Application Default Credentials only: the Cloud Run runtime service account. No key file.
  return new Storage({ retryOptions: RETRY_OPTIONS }).bucket(bucket);
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 404
  );
}

function isStoredSnapshot(value: unknown): value is StoredSnapshot<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.fetchedAt === 'string' &&
    typeof candidate.contentHash === 'string' &&
    'payload' in candidate
  );
}

/**
 * One JSON object per key: `<prefix>/<key>.json`. `fetchedAt` and `contentHash`
 * are also custom object metadata so `stat` never downloads the body. The GCS
 * client is created on first use, never at construction or application boot.
 */
export class GcsSnapshotStore implements SnapshotStore {
  private readonly logger = new Logger(GcsSnapshotStore.name);
  private bucketHandle: GcsBucketLike | undefined;

  constructor(private readonly options: GcsSnapshotStoreOptions) {}

  async stat(key: string): Promise<SnapshotStat | undefined> {
    try {
      const [metadata] = await this.file(key).getMetadata();
      const { fetchedAt, contentHash } = metadata.metadata ?? {};

      if (typeof fetchedAt !== 'string' || typeof contentHash !== 'string') {
        this.logger.warn(`Snapshot "${this.objectName(key)}" has no usable metadata; ignoring it`);
        return undefined;
      }

      return { fetchedAt, contentHash };
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async read<T>(key: string): Promise<StoredSnapshot<T> | undefined> {
    let body: Buffer;
    try {
      [body] = await this.file(key).download();
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }
      throw error;
    }

    try {
      const parsed: unknown = JSON.parse(body.toString('utf-8'));
      if (isStoredSnapshot(parsed)) {
        return parsed as StoredSnapshot<T>;
      }
    } catch {
      // Falls through to the warning below: unparseable content is treated as missing.
    }
    this.logger.warn(`Snapshot "${this.objectName(key)}" is not valid snapshot JSON; ignoring it`);

    return undefined;
  }

  async write<T>(key: string, snapshot: StoredSnapshot<T>): Promise<void> {
    await this.file(key).save(JSON.stringify(snapshot), {
      contentType: 'application/json',
      // A resumable upload spends several Class A operations; the payload is a few MB at most.
      resumable: false,
      metadata: {
        metadata: { fetchedAt: snapshot.fetchedAt, contentHash: snapshot.contentHash },
      },
    });
  }

  private objectName(key: string): string {
    return `${this.options.prefix}/${key}.json`;
  }

  private file(key: string): GcsFileLike {
    this.bucketHandle ??= (this.options.createBucket ?? createDefaultBucket)(this.options.bucket);

    return this.bucketHandle.file(this.objectName(key));
  }
}

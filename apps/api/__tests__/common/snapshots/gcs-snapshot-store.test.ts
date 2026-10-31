import { Logger } from '@nestjs/common';

import {
  type GcsBucketLike,
  type GcsFileLike,
  GcsSnapshotStore,
} from '../../../src/common/snapshots/gcs-snapshot-store';

interface SavedObject {
  body: string;
  options: Parameters<GcsFileLike['save']>[1];
}

/** Fake bucket: objects live in a map keyed by object name; no network, no credentials. */
class FakeBucket implements GcsBucketLike {
  readonly objects = new Map<string, SavedObject>();
  readonly opened: string[] = [];
  readonly downloads: string[] = [];
  readonly metadataReads: string[] = [];

  file(name: string): GcsFileLike {
    return {
      getMetadata: () => {
        this.metadataReads.push(name);
        const object = this.objects.get(name);
        if (!object) {
          return Promise.reject(Object.assign(new Error('No such object'), { code: 404 }));
        }
        return Promise.resolve([{ metadata: object.options.metadata.metadata }]);
      },
      download: () => {
        this.downloads.push(name);
        const object = this.objects.get(name);
        if (!object) {
          return Promise.reject(Object.assign(new Error('No such object'), { code: 404 }));
        }
        return Promise.resolve([Buffer.from(object.body)]);
      },
      save: (body, options) => {
        this.objects.set(name, { body, options });
        return Promise.resolve();
      },
    };
  }
}

function buildStore(
  prefix: string,
  bucket: FakeBucket = new FakeBucket(),
): { store: GcsSnapshotStore; bucket: FakeBucket; createBucket: jest.Mock } {
  const createBucket = jest.fn(() => bucket);
  const store = new GcsSnapshotStore({ bucket: 'my-bucket', prefix, createBucket });
  return { store, bucket, createBucket };
}

const SNAPSHOT = {
  fetchedAt: '2026-10-28T12:00:00.000Z',
  contentHash: 'abc123',
  payload: { data: { answer: 42 }, lastUpdated: '2026-10-27T00:00:00.000Z' },
};

describe('GcsSnapshotStore', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should create the bucket handle lazily, only on first use, with the configured bucket', async () => {
    const { store, createBucket } = buildStore('development');

    expect(createBucket).not.toHaveBeenCalled();

    await store.stat('energy-sources');
    await store.stat('energy-sources');

    expect(createBucket).toHaveBeenCalledTimes(1);
    expect(createBucket).toHaveBeenCalledWith('my-bucket');
  });

  it('should write one JSON object under the environment prefix', async () => {
    const { store, bucket } = buildStore('development');

    await store.write('energy-sources', SNAPSHOT);

    expect([...bucket.objects.keys()]).toEqual(['development/energy-sources.json']);
    const saved = bucket.objects.get('development/energy-sources.json');
    expect(JSON.parse(saved?.body ?? '')).toEqual(SNAPSHOT);
  });

  it('should write with the JSON content type, a non-resumable upload and custom metadata', async () => {
    const { store, bucket } = buildStore('production');

    await store.write('co2-emissions', SNAPSHOT);

    expect(bucket.objects.get('production/co2-emissions.json')?.options).toEqual({
      contentType: 'application/json',
      resumable: false,
      metadata: { metadata: { fetchedAt: SNAPSHOT.fetchedAt, contentHash: SNAPSHOT.contentHash } },
    });
  });

  it('should not collide between environments sharing a bucket and a key', async () => {
    const bucket = new FakeBucket();
    const production = buildStore('production', bucket).store;
    const development = buildStore('development', bucket).store;

    await production.write('energy-sources', SNAPSHOT);
    await development.write('energy-sources', { ...SNAPSHOT, contentHash: 'other' });

    expect([...bucket.objects.keys()].sort()).toEqual([
      'development/energy-sources.json',
      'production/energy-sources.json',
    ]);
    expect((await production.stat('energy-sources'))?.contentHash).toBe('abc123');
  });

  it('should stat from object metadata without downloading the body', async () => {
    const { store, bucket } = buildStore('development');
    await store.write('energy-sources', SNAPSHOT);

    const stat = await store.stat('energy-sources');

    expect(stat).toEqual({ fetchedAt: SNAPSHOT.fetchedAt, contentHash: SNAPSHOT.contentHash });
    expect(bucket.metadataReads).toEqual(['development/energy-sources.json']);
    expect(bucket.downloads).toEqual([]);
  });

  it('should read the stored snapshot back', async () => {
    const { store } = buildStore('development');
    await store.write('energy-sources', SNAPSHOT);

    await expect(store.read('energy-sources')).resolves.toEqual(SNAPSHOT);
  });

  it('should resolve undefined for a missing object on stat and read, without a warning', async () => {
    const { store } = buildStore('development');

    await expect(store.stat('energy-sources')).resolves.toBeUndefined();
    await expect(store.read('energy-sources')).resolves.toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should treat an object that is not valid JSON as missing with a warning', async () => {
    const { store, bucket } = buildStore('development');
    bucket.objects.set('development/energy-sources.json', {
      body: '{not json',
      options: { contentType: 'application/json', resumable: false, metadata: { metadata: {} } },
    });

    await expect(store.read('energy-sources')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('development/energy-sources.json'),
    );
  });

  it.each([
    ['a JSON array', '[]'],
    ['null', 'null'],
    ['a snapshot without a hash', JSON.stringify({ fetchedAt: 'x', payload: {} })],
    ['a snapshot without a payload', JSON.stringify({ fetchedAt: 'x', contentHash: 'y' })],
  ])('should treat %s as missing with a warning', async (_label, body) => {
    const { store, bucket } = buildStore('development');
    bucket.objects.set('development/energy-sources.json', {
      body,
      options: { contentType: 'application/json', resumable: false, metadata: { metadata: {} } },
    });

    await expect(store.read('energy-sources')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('should treat an object without usable metadata as missing on stat, with a warning', async () => {
    const { store, bucket } = buildStore('development');
    bucket.objects.set('development/energy-sources.json', {
      body: '{}',
      options: { contentType: 'application/json', resumable: false, metadata: { metadata: {} } },
    });

    await expect(store.stat('energy-sources')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['stat', (store: GcsSnapshotStore) => store.stat('energy-sources')],
    ['read', (store: GcsSnapshotStore) => store.read('energy-sources')],
  ])('should propagate a non-404 error on %s so the service can warn', async (_op, run) => {
    const failing: GcsBucketLike = {
      file: () => ({
        getMetadata: () => Promise.reject(Object.assign(new Error('forbidden'), { code: 403 })),
        download: () => Promise.reject(new Error('socket hang up')),
        save: () => Promise.resolve(),
      }),
    };
    const store = new GcsSnapshotStore({
      bucket: 'my-bucket',
      prefix: 'development',
      createBucket: () => failing,
    });

    await expect(run(store)).rejects.toThrow();
  });
});

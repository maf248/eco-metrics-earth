import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { DisabledSnapshotStore } from '../../../src/common/snapshots/disabled-snapshot-store';
import { GcsSnapshotStore } from '../../../src/common/snapshots/gcs-snapshot-store';
import { ProviderSnapshotService } from '../../../src/common/snapshots/provider-snapshot.service';
import { SNAPSHOT_STORE } from '../../../src/common/snapshots/snapshot-store';
import { SnapshotsModule } from '../../../src/common/snapshots/snapshots.module';
import { envValidationSchema } from '../../../src/config/env-validation.schema';

async function buildModule(env: Record<string, string>): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => env],
        validationSchema: envValidationSchema,
      }),
      SnapshotsModule,
    ],
  }).compile();
}

describe('SnapshotsModule', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should provide the disabled store and log it when the bucket is unset', async () => {
    const module = await buildModule({});

    expect(module.get(SNAPSHOT_STORE)).toBeInstanceOf(DisabledSnapshotStore);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('disabled'));
  });

  it('should provide the disabled store when the bucket is empty', async () => {
    const module = await buildModule({ SNAPSHOT_BUCKET: '' });

    expect(module.get(SNAPSHOT_STORE)).toBeInstanceOf(DisabledSnapshotStore);
  });

  it('should provide the GCS store for the bucket and prefix when both are set', async () => {
    const module = await buildModule({
      SNAPSHOT_BUCKET: 'my-bucket',
      SNAPSHOT_PREFIX: 'production',
    });

    expect(module.get(SNAPSHOT_STORE)).toBeInstanceOf(GcsSnapshotStore);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('gs://my-bucket/production/'));
  });

  it('should export the snapshot service', async () => {
    const module = await buildModule({});

    expect(module.get(ProviderSnapshotService)).toBeInstanceOf(ProviderSnapshotService);
  });
});

describe('DisabledSnapshotStore', () => {
  it('should resolve undefined for stat and read and nothing for write', async () => {
    const store = new DisabledSnapshotStore();

    await expect(store.stat()).resolves.toBeUndefined();
    await expect(store.read()).resolves.toBeUndefined();
    await expect(store.write()).resolves.toBeUndefined();
  });
});

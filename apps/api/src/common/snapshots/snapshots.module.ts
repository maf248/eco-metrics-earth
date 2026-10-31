import { Logger, Module } from '@nestjs/common';

import { AppConfigModule } from '../../config/app-config.module';
import { AppConfigService } from '../../config/app-config.service';

import { DisabledSnapshotStore } from './disabled-snapshot-store';
import { GcsSnapshotStore } from './gcs-snapshot-store';
import { ProviderSnapshotService } from './provider-snapshot.service';
import { SNAPSHOT_STORE, type SnapshotStore } from './snapshot-store';

const logger = new Logger('SnapshotsModule');

export function createSnapshotStore(appConfig: AppConfigService): SnapshotStore {
  const { snapshotBucket, snapshotPrefix } = appConfig;

  if (snapshotBucket === undefined || snapshotPrefix === undefined) {
    logger.log('Snapshot persistence is disabled (SNAPSHOT_BUCKET is not set)');
    return new DisabledSnapshotStore();
  }

  logger.log(`Snapshot persistence enabled: gs://${snapshotBucket}/${snapshotPrefix}/`);
  return new GcsSnapshotStore({ bucket: snapshotBucket, prefix: snapshotPrefix });
}

@Module({
  imports: [AppConfigModule],
  providers: [
    { provide: SNAPSHOT_STORE, inject: [AppConfigService], useFactory: createSnapshotStore },
    ProviderSnapshotService,
  ],
  exports: [ProviderSnapshotService],
})
export class SnapshotsModule {}

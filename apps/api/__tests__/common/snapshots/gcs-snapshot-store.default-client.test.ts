import { Storage } from '@google-cloud/storage';

import { GcsSnapshotStore } from '../../../src/common/snapshots/gcs-snapshot-store';

const save = jest.fn(() => Promise.resolve());
const file = jest.fn(() => ({ save }));
const bucket = jest.fn(() => ({ file }));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn(() => ({ bucket })),
}));

describe('GcsSnapshotStore default client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not create a client until the first call', () => {
    new GcsSnapshotStore({ bucket: 'my-bucket', prefix: 'development' });

    expect(Storage).not.toHaveBeenCalled();
  });

  it('should create one client with bounded retries, ADC only, and reuse it', async () => {
    const store = new GcsSnapshotStore({ bucket: 'my-bucket', prefix: 'development' });
    const snapshot = { fetchedAt: '2026-10-28T12:00:00.000Z', contentHash: 'h', payload: {} };

    await store.write('energy-sources', snapshot);
    await store.write('co2-emissions', snapshot);

    expect(Storage).toHaveBeenCalledTimes(1);
    expect(Storage).toHaveBeenCalledWith({ retryOptions: { maxRetries: 2, totalTimeout: 10 } });
    expect(bucket).toHaveBeenCalledWith('my-bucket');
    expect(file).toHaveBeenCalledWith('development/energy-sources.json');
    expect(file).toHaveBeenCalledWith('development/co2-emissions.json');
  });
});

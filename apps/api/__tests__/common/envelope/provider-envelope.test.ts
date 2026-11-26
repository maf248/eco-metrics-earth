import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { buildProviderEnvelope } from '../../../src/common/envelope/provider-envelope';
import { NOAA_LSA_PUBLISHER } from '../../../src/common/publishers/publishers';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('buildProviderEnvelope', () => {
  const fresh = { fetchedAt: '2026-11-24T09:00:00.000Z', stale: false };

  it('should wrap the data with the given publisher and the provider timestamp', () => {
    const data = { answer: 42 };

    const envelope = buildProviderEnvelope(
      NOAA_LSA_PUBLISHER,
      data,
      '2026-11-20T00:00:00.000Z',
      fresh,
    );

    expect(envelope).toEqual({
      success: true,
      status: 200,
      data,
      meta: {
        source: { ...NOAA_LSA_PUBLISHER, lastUpdated: '2026-11-20T00:00:00.000Z' },
        fetchedAt: '2026-11-24T09:00:00.000Z',
        stale: false,
      },
    });
  });

  it('should carry the stored fetch time and the stale flag of a snapshot', () => {
    const envelope = buildProviderEnvelope(NOAA_LSA_PUBLISHER, {}, '2026-11-20T00:00:00.000Z', {
      fetchedAt: '2026-11-21T10:00:00.000Z',
      stale: true,
    });

    expect(envelope.meta?.fetchedAt).toBe('2026-11-21T10:00:00.000Z');
    expect(envelope.meta?.stale).toBe(true);
  });

  it('should not mutate the publisher definition', () => {
    buildProviderEnvelope(NOAA_LSA_PUBLISHER, {}, '2026-11-20T00:00:00.000Z', fresh);

    expect(NOAA_LSA_PUBLISHER).not.toHaveProperty('lastUpdated');
  });

  it('should keep common/ free of imports from modules/', () => {
    const commonDir = join(__dirname, '../../../src/common');

    const offenders = sourceFiles(commonDir).filter((file) =>
      /from\s+'(\.\.\/)+modules\//.test(readFileSync(file, 'utf-8')),
    );

    expect(offenders).toEqual([]);
  });
});

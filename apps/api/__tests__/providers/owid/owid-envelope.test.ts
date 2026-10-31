import { buildOwidEnvelope } from '../../../src/modules/providers/owid/owid-envelope';
import { OWID_PUBLISHER } from '../../../src/modules/providers/owid/owid.attribution';

describe('buildOwidEnvelope', () => {
  const fresh = { fetchedAt: '2026-10-28T09:00:00.000Z', stale: false };

  it('should wrap the data with the OWID attribution and the provider timestamp', () => {
    const data = { answer: 42 };

    const envelope = buildOwidEnvelope(data, '2026-10-13T08:42:32.000Z', fresh);

    expect(envelope).toMatchObject({
      success: true,
      status: 200,
      data,
      meta: { source: { ...OWID_PUBLISHER, lastUpdated: '2026-10-13T08:42:32.000Z' } },
    });
  });

  it('should emit the given fetch time and a fresh flag', () => {
    const envelope = buildOwidEnvelope({}, '2026-10-13T08:42:32.000Z', fresh);

    expect(envelope.meta?.fetchedAt).toBe('2026-10-28T09:00:00.000Z');
    expect(envelope.meta?.stale).toBe(false);
  });

  it('should emit the stored fetch time and a stale flag for a snapshot', () => {
    const envelope = buildOwidEnvelope({}, '2026-10-13T08:42:32.000Z', {
      fetchedAt: '2026-10-20T10:00:00.000Z',
      stale: true,
    });

    expect(envelope.meta?.fetchedAt).toBe('2026-10-20T10:00:00.000Z');
    expect(envelope.meta?.stale).toBe(true);
  });

  it('should rebuild the source from the current publisher definition', () => {
    const envelope = buildOwidEnvelope({}, '2026-10-13T08:42:32.000Z', {
      fetchedAt: '2026-10-20T10:00:00.000Z',
      stale: true,
    });

    expect(envelope.meta?.source).toEqual({
      ...OWID_PUBLISHER,
      lastUpdated: '2026-10-13T08:42:32.000Z',
    });
  });
});

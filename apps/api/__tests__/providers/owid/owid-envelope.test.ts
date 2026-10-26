import { buildOwidEnvelope } from '../../../src/modules/providers/owid/owid-envelope';
import { OWID_PUBLISHER } from '../../../src/modules/providers/owid/owid.attribution';

describe('buildOwidEnvelope', () => {
  it('should wrap the data with the OWID attribution and the provider timestamp', () => {
    const data = { answer: 42 };

    const envelope = buildOwidEnvelope(data, '2026-10-13T08:42:32.000Z');

    expect(envelope).toMatchObject({
      success: true,
      status: 200,
      data,
      meta: { source: { ...OWID_PUBLISHER, lastUpdated: '2026-10-13T08:42:32.000Z' } },
    });
  });

  it('should stamp the response with an ISO 8601 assembly time', () => {
    const before = Date.now();

    const envelope = buildOwidEnvelope({}, '2026-10-13T08:42:32.000Z');

    const fetchedAt = envelope.meta?.fetchedAt ?? '';
    expect(new Date(fetchedAt).toISOString()).toBe(fetchedAt);
    expect(Date.parse(fetchedAt)).toBeGreaterThanOrEqual(before);
  });
});

import { readFileSync } from 'fs';
import { join } from 'path';

import { Test } from '@nestjs/testing';

import { ProviderDataError, ProviderError } from '../../../src/common/errors/provider-error';
import { OUTBOUND_FETCH } from '../../../src/common/http/outbound-http-client.service';
import { NOAA_LSA_PUBLISHER } from '../../../src/common/publishers/publishers';
import { AppConfigService } from '../../../src/config/app-config.service';
import { NoaaLsaClient } from '../../../src/modules/providers/noaa-lsa/noaa-lsa-client.service';
import { NoaaLsaStatus } from '../../../src/modules/providers/noaa-lsa/noaa-lsa-status';
import { NOAA_LSA_ORIGIN } from '../../../src/modules/providers/noaa-lsa/noaa-lsa.constants';
import { NoaaLsaModule } from '../../../src/modules/providers/noaa-lsa/noaa-lsa.module';
import { parseNoaaLsaCsv } from '../../../src/modules/providers/noaa-lsa/noaa-lsa.parser';

const FIXTURE = readFileSync(
  join(__dirname, '../../ocean-health/fixtures/slr_sla_gbl_free_ref_90.csv'),
  'utf-8',
);

const TREND = '#trend = 3.11 mm/year (no glacial isostatic adjustment correction)';

function csv(header: string, rows: string[], trend: string | null = TREND): string {
  return [...(trend === null ? [] : [trend]), header, ...rows].join('\n');
}

describe('parseNoaaLsaCsv', () => {
  it('should parse the trend, the missions and every row of the fixture', () => {
    const series = parseNoaaLsaCsv(FIXTURE);

    expect(series.trend).toEqual({
      value: 3.11,
      unit: 'mm/year',
      note: 'no glacial isostatic adjustment correction',
    });
    expect(series.missions).toEqual([
      'TOPEX/Poseidon',
      'Jason-1',
      'Jason-2',
      'Jason-3',
      'Sentinel-6MF',
    ]);
    expect(series.rows).toHaveLength(300);
    expect(series.rows.every(({ values }) => values.length === 5)).toBe(true);
  });

  it('should read blank cells as null', () => {
    const series = parseNoaaLsaCsv(
      csv('year,A,B,C,D', ['1992.96140,-19.33000,,,', '2002.05370,1.5,2.5,,']),
    );

    expect(series.rows[0]).toEqual({ year: 1992.9614, values: [-19.33, null, null, null] });
    expect(series.rows[1].values).toEqual([1.5, 2.5, null, null]);
  });

  it('should accept extra mission columns', () => {
    const series = parseNoaaLsaCsv(csv('year,A,B,C,D,E,F', ['2030.5,,,,,,1.5']));

    expect(series.missions).toHaveLength(6);
  });

  it('should tolerate CRLF line endings and blank lines', () => {
    const body = `${csv('year,A', ['2000.5,1', '']).replace(/\n/g, '\r\n')}\r\n`;

    expect(parseNoaaLsaCsv(body).rows).toHaveLength(1);
  });

  it.each([
    ['no trend line', csv('year,A', ['2000.5,1'], null)],
    ['a malformed trend line', csv('year,A', ['2000.5,1'], '#trend = fast mm/year (x)')],
  ])('should throw ProviderDataError for %s', (_, body) => {
    expect(() => parseNoaaLsaCsv(body)).toThrow(ProviderDataError);
    expect(() => parseNoaaLsaCsv(body)).toThrow(/trend/);
  });

  it.each([
    ['a header that does not start with year', csv('date,A', ['2000.5,1'])],
    ['a header without mission columns', csv('year', ['2000.5'])],
    ['an unnamed mission column', csv('year,A,', ['2000.5,1,'])],
    ['a non-numeric year', csv('year,A', ['abc,1'])],
    ['a non-numeric value', csv('year,A', ['2000.5,abc'])],
    ['a row with the wrong column count', csv('year,A,B', ['2000.5,1'])],
    ['no data rows', csv('year,A', [])],
    ['only comments', TREND],
    ['an empty body', ''],
  ])('should throw ProviderDataError for %s', (_, body) => {
    expect(() => parseNoaaLsaCsv(body)).toThrow(ProviderDataError);
  });
});

describe('NoaaLsaClient', () => {
  async function build(fetchStub: jest.Mock): Promise<NoaaLsaClient> {
    const moduleRef = await Test.createTestingModule({ imports: [NoaaLsaModule] })
      .overrideProvider(OUTBOUND_FETCH)
      .useValue(fetchStub)
      .overrideProvider(AppConfigService)
      .useValue({
        noaaLsaBaseUrl: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr',
        noaaLsaCacheTtlSeconds: 3600,
        owidHttpTimeoutMs: 10000,
      } as AppConfigService)
      .compile();

    return moduleRef.get(NoaaLsaClient);
  }

  const serving = (body: string): jest.Mock =>
    jest.fn().mockImplementation(() => Promise.resolve(new Response(body, { status: 200 })));

  it('should request the CSV under the configured base URL', async () => {
    const fetchStub = serving(FIXTURE);
    const client = await build(fetchStub);

    await client.getSeaLevelSeries();

    expect(fetchStub.mock.calls[0][0]).toBe(
      'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_free_ref_90.csv',
    );
  });

  it('should call the transport once within the TTL and return copies', async () => {
    const fetchStub = serving(FIXTURE);
    const client = await build(fetchStub);

    const first = await client.getSeaLevelSeries();
    first.rows.pop();
    first.trend.value = 0;
    const second = await client.getSeaLevelSeries();

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(second.rows).toHaveLength(300);
    expect(second.trend.value).toBe(3.11);
  });

  it('should keep the retrieval time of the download behind the cached entry', async () => {
    const client = await build(serving(FIXTURE));

    const first = await client.getSeaLevelSeries();
    const second = await client.getSeaLevelSeries();

    expect(new Date(first.retrievedAt).toISOString()).toBe(first.retrievedAt);
    expect(second.retrievedAt).toBe(first.retrievedAt);
  });

  it('should throw a ProviderError when the transport answers 503 every time', async () => {
    const fetchStub = jest
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('down', { status: 503 })));
    const client = await build(fetchStub);

    await expect(client.getSeaLevelSeries()).rejects.toBeInstanceOf(ProviderError);
  }, 15_000);
});

describe('NoaaLsaStatus', () => {
  it('should contribute nothing before a category registers', () => {
    expect(new NoaaLsaStatus().getDataSources()).toEqual([]);
  });

  it('should declare one provider entry with the retrieval basis and its origin', () => {
    const status = new NoaaLsaStatus();
    status.registerCategory('ocean-health');

    const contributions = status.getDataSources();

    expect(contributions).toHaveLength(1);
    expect(contributions[0].source).toMatchObject({
      id: 'noaa-lsa',
      ...NOAA_LSA_PUBLISHER,
      provider: 'NOAA Laboratory for Satellite Altimetry',
      sourceUrl: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/',
      categories: ['ocean-health'],
      lastUpdatedBasis: 'retrieval',
    });
    expect(contributions[0].source).toHaveProperty('origins', [
      { ...NOAA_LSA_ORIGIN, categories: ['ocean-health'] },
    ]);
  });

  it('should carry the acknowledgment as the origin notice', () => {
    expect(NOAA_LSA_ORIGIN.notice).toBe(
      'Altimetry data are provided by NOAA Laboratory for Satellite Altimetry.',
    );
  });

  it('should move the timestamp only forward with each retrieval', () => {
    const status = new NoaaLsaStatus();
    status.registerCategory('ocean-health');

    status.recordRetrieval('2999-01-02T00:00:00.000Z');
    status.recordRetrieval('2999-01-01T00:00:00.000Z');

    expect(status.getDataSources()[0].source).toMatchObject({
      lastUpdated: '2999-01-02T00:00:00.000Z',
      lastUpdatedBasis: 'retrieval',
    });
  });
});

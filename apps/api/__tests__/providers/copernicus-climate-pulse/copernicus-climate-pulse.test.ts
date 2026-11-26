import { readFileSync } from 'fs';
import { join } from 'path';

import { Test } from '@nestjs/testing';

import { ProviderDataError, ProviderError } from '../../../src/common/errors/provider-error';
import { OUTBOUND_FETCH } from '../../../src/common/http/outbound-http-client.service';
import { COPERNICUS_CLIMATE_PULSE_PUBLISHER } from '../../../src/common/publishers/publishers';
import { AppConfigService } from '../../../src/config/app-config.service';
import { CopernicusClimatePulseClient } from '../../../src/modules/providers/copernicus-climate-pulse/copernicus-climate-pulse-client.service';
import { CopernicusClimatePulseStatus } from '../../../src/modules/providers/copernicus-climate-pulse/copernicus-climate-pulse-status';
import { COPERNICUS_CLIMATE_PULSE_ORIGIN } from '../../../src/modules/providers/copernicus-climate-pulse/copernicus-climate-pulse.constants';
import { CopernicusClimatePulseModule } from '../../../src/modules/providers/copernicus-climate-pulse/copernicus-climate-pulse.module';
import { parseCopernicusSstCsv } from '../../../src/modules/providers/copernicus-climate-pulse/copernicus-climate-pulse.parser';

const FIXTURE = readFileSync(
  join(__dirname, '../../ocean-health/fixtures/era5_daily_series_sst_60S-60N_ocean.csv'),
  'utf-8',
);

const HEADER = 'date,sst,clim_91-20,ano_91-20,status';

function csv(
  lines: string[],
  { units = '# Units: deg. C', updated = '# Last updated: 24 Nov 2026' } = {},
) {
  return ['# Description: test', units, updated, HEADER, ...lines].join('\n');
}

describe('parseCopernicusSstCsv', () => {
  it('should skip the # lines and return the data rows in file order', () => {
    const { rows } = parseCopernicusSstCsv(FIXTURE);

    expect(rows).toHaveLength(841);
    expect(rows[0]).toEqual({
      date: '2023-01-01',
      sst: expect.any(Number),
      climatology: expect.any(Number),
      anomaly: expect.any(Number),
      status: 'FINAL',
    });
    expect(rows.at(-1)).toMatchObject({ date: '2025-04-20', status: 'PRELIMINARY' });
    expect(rows.some(({ date }) => date === '2024-02-29')).toBe(true);
  });

  it('should take the provider timestamp from the Last updated line', () => {
    expect(parseCopernicusSstCsv(FIXTURE).lastUpdated).toBe('2026-11-24T00:00:00.000Z');
  });

  it('should fall back to the date of the latest row at UTC midnight', () => {
    const body = csv(['2026-11-21,20.1,20.0,0.1,FINAL', '2026-11-22,20.2,20.0,0.2,FINAL'], {
      updated: '# Something else',
    });

    expect(parseCopernicusSstCsv(body).lastUpdated).toBe('2026-11-22T00:00:00.000Z');
  });

  it('should fall back when the Last updated line has an unknown month', () => {
    const body = csv(['2026-11-22,20.2,20.0,0.2,FINAL'], {
      updated: '# Last updated: 24 Xyz 2026',
    });

    expect(parseCopernicusSstCsv(body).lastUpdated).toBe('2026-11-22T00:00:00.000Z');
  });

  it('should tolerate CRLF line endings and blank lines', () => {
    const body = `${csv(['2026-11-22,20.2,20.0,0.2,FINAL', '']).replace(/\n/g, '\r\n')}\r\n\r\n`;

    expect(parseCopernicusSstCsv(body).rows).toHaveLength(1);
  });

  it('should throw ProviderDataError when the baseline columns change', () => {
    const body = csv(['2026-11-22,20.2,20.0,0.2,FINAL']).replace('clim_91-20', 'clim_81-10');

    expect(() => parseCopernicusSstCsv(body)).toThrow(ProviderDataError);
    expect(() => parseCopernicusSstCsv(body)).toThrow(/header/);
  });

  it('should throw ProviderDataError when the units are not deg. C', () => {
    const body = csv(['2026-11-22,20.2,20.0,0.2,FINAL'], { units: '# Units: K' });

    expect(() => parseCopernicusSstCsv(body)).toThrow(/unit is "K"/);
  });

  it('should throw ProviderDataError when the units line is missing', () => {
    const body = ['# Description', HEADER, '2026-11-22,20.2,20.0,0.2,FINAL'].join('\n');

    expect(() => parseCopernicusSstCsv(body)).toThrow(/unit is "missing"/);
  });

  it.each([
    ['a non-numeric sst', '2026-11-22,abc,20.0,0.2,FINAL', /line 5.*sst/],
    ['an empty climatology', '2026-11-22,20.2,,0.2,FINAL', /line 5.*clim_91-20/],
    ['a non-ISO date', '22/11/2026,20.2,20.0,0.2,FINAL', /line 5.*date/],
    ['an impossible date', '2026-02-30,20.2,20.0,0.2,FINAL', /line 5.*date/],
    ['a missing column', '2026-11-22,20.2,20.0,0.2', /line 5.*5 columns/],
    ['an empty status', '2026-11-22,20.2,20.0,0.2,', /line 5.*status/],
  ])('should throw ProviderDataError naming the line for %s', (_, row, message) => {
    expect(() => parseCopernicusSstCsv(csv([row]))).toThrow(ProviderDataError);
    expect(() => parseCopernicusSstCsv(csv([row]))).toThrow(message);
  });

  it.each([
    ['an empty body', ''],
    ['only comments', '# Units: deg. C\n# Last updated: 24 Nov 2026\n'],
    ['a header without rows', csv([])],
  ])('should throw ProviderDataError for %s', (_, body) => {
    expect(() => parseCopernicusSstCsv(body)).toThrow(ProviderDataError);
  });
});

describe('CopernicusClimatePulseClient', () => {
  async function build(fetchStub: jest.Mock): Promise<{
    client: CopernicusClimatePulseClient;
  }> {
    const moduleRef = await Test.createTestingModule({ imports: [CopernicusClimatePulseModule] })
      .overrideProvider(OUTBOUND_FETCH)
      .useValue(fetchStub)
      .overrideProvider(AppConfigService)
      .useValue({
        copernicusClimatePulseBaseUrl: 'https://sites.ecmwf.int/data/climatepulse/data/series',
        copernicusClimatePulseCacheTtlSeconds: 60,
        owidHttpTimeoutMs: 10000,
      } as AppConfigService)
      .compile();

    return { client: moduleRef.get(CopernicusClimatePulseClient) };
  }

  const serving = (body: string): jest.Mock =>
    jest.fn().mockImplementation(() => Promise.resolve(new Response(body, { status: 200 })));

  it('should request the CSV under the configured base URL', async () => {
    const fetchStub = serving(FIXTURE);
    const { client } = await build(fetchStub);

    const series = await client.getDailySeaSurfaceTemperature();

    expect(fetchStub.mock.calls[0][0]).toBe(
      'https://sites.ecmwf.int/data/climatepulse/data/series/era5_daily_series_sst_60S-60N_ocean.csv',
    );
    expect(series.rows).toHaveLength(841);
  });

  it('should call the transport once within the TTL and return copies', async () => {
    const fetchStub = serving(FIXTURE);
    const { client } = await build(fetchStub);

    const first = await client.getDailySeaSurfaceTemperature();
    first.rows[0].sst = 99;
    first.rows.pop();
    const second = await client.getDailySeaSurfaceTemperature();

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(second.rows).toHaveLength(841);
    expect(second.rows[0].sst).not.toBe(99);
  });

  it('should throw a ProviderError when the transport answers 503 every time', async () => {
    const fetchStub = jest
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('down', { status: 503 })));
    const { client } = await build(fetchStub);

    await expect(client.getDailySeaSurfaceTemperature()).rejects.toBeInstanceOf(ProviderError);
    expect(fetchStub).toHaveBeenCalledTimes(3);
  }, 15_000);

  it('should throw ProviderDataError for a changed layout', async () => {
    const { client } = await build(
      serving(FIXTURE.replace('clim_91-20,ano_91-20,status', 'clim_91-20,ano_81-10,status')),
    );

    await expect(client.getDailySeaSurfaceTemperature()).rejects.toBeInstanceOf(ProviderDataError);
  });
});

describe('CopernicusClimatePulseStatus', () => {
  it('should contribute nothing before a category registers', () => {
    expect(new CopernicusClimatePulseStatus().getDataSources()).toEqual([]);
  });

  it('should declare one provider entry with its publisher and origin', () => {
    const status = new CopernicusClimatePulseStatus();
    status.registerCategory('ocean-health');

    const [contribution] = status.getDataSources();

    expect(status.getDataSources()).toHaveLength(1);
    expect(contribution.kind).toBe('provider');
    expect(contribution.source).toMatchObject({
      id: 'copernicus-climate-pulse',
      ...COPERNICUS_CLIMATE_PULSE_PUBLISHER,
      provider: 'Copernicus Climate Pulse',
      license: 'CC BY 4.0',
      sourceUrl: 'https://pulse.climate.copernicus.eu',
      categories: ['ocean-health'],
      lastUpdatedBasis: 'retrieval',
    });
    expect(contribution.source).toHaveProperty('origins', [
      { ...COPERNICUS_CLIMATE_PULSE_ORIGIN, categories: ['ocean-health'] },
    ]);
  });

  it('should switch to the provider basis and keep the latest timestamp', () => {
    const status = new CopernicusClimatePulseStatus();
    status.registerCategory('ocean-health');

    status.recordProviderUpdate('2026-11-24T00:00:00.000Z');
    status.recordProviderUpdate('2026-11-20T00:00:00.000Z');

    expect(status.getDataSources()[0].source).toMatchObject({
      lastUpdated: '2026-11-24T00:00:00.000Z',
      lastUpdatedBasis: 'provider',
    });
  });
});

import { readFileSync } from 'fs';
import { join } from 'path';

import { Test } from '@nestjs/testing';

import { OUTBOUND_FETCH } from '../../../src/common/http/outbound-http-client.service';
import { AppConfigService } from '../../../src/config/app-config.service';
import { OwidClient } from '../../../src/modules/providers/owid/owid-client.service';
import {
  OwidInvalidParameterError,
  OwidParseError,
} from '../../../src/modules/providers/owid/owid-errors';
import { OwidModule } from '../../../src/modules/providers/owid/owid.module';

const PH_COLUMNS = ['ocean_ph_yearly_average', 'ocean_ph'];
const PH_FIXTURE = readFileSync(
  join(__dirname, '../../ocean-health/fixtures/seawater-ph.csv'),
  'utf-8',
);

function text(body: string): Response {
  return new Response(body, { status: 200 });
}

function serving(body: string): jest.Mock {
  return jest.fn().mockImplementation(() => Promise.resolve(text(body)));
}

async function buildClient(fetchStub: jest.Mock): Promise<OwidClient> {
  const moduleRef = await Test.createTestingModule({ imports: [OwidModule] })
    .overrideProvider(OUTBOUND_FETCH)
    .useValue(fetchStub)
    .overrideProvider(AppConfigService)
    .useValue({
      owidGrapherBaseUrl: 'https://ourworldindata.org/grapher',
      owidApiBaseUrl: 'https://api.ourworldindata.org/v1',
      owidHttpTimeoutMs: 10000,
      owidCacheTtlSeconds: 60,
    } as AppConfigService)
    .compile();

  return moduleRef.get(OwidClient);
}

describe('OwidClient.getGrapherDatedSeries', () => {
  it('should parse the dated rows ascending with a blank cell as null', async () => {
    const fetchStub = serving(PH_FIXTURE);
    const client = await buildClient(fetchStub);

    const series = await client.getGrapherDatedSeries('seawater-ph', { columns: PH_COLUMNS });

    expect(series.entityName).toBe('Hawaii');
    expect(series.columns).toEqual(PH_COLUMNS);
    const dates = series.rows.map(({ date }) => date);
    expect(dates).toEqual([...dates].sort());
    expect(series.rows[0]).toEqual({ date: '1988-10-31', values: [null, 8.1097] });
    expect(series.rows.at(-1)?.values[0]).toBe(8.042414);
  });

  it('should sort rows that arrive out of order', async () => {
    const csv = 'entity,day,v\nHawaii,2020-02-01,2\nHawaii,2020-01-01,1\n';
    const client = await buildClient(serving(csv));

    const series = await client.getGrapherDatedSeries('chart', { columns: ['v'] });

    expect(series.rows.map(({ date }) => date)).toEqual(['2020-01-01', '2020-02-01']);
  });

  it('should request the filtered CSV with the optional tab and country', async () => {
    const fetchStub = serving(PH_FIXTURE);
    const client = await buildClient(fetchStub);

    await client.getGrapherDatedSeries('seawater-ph', {
      columns: PH_COLUMNS,
      tab: 'chart',
      country: ['OWID_WRL'],
    });
    await client.getGrapherDatedSeries('other-chart', { columns: PH_COLUMNS });

    expect(fetchStub.mock.calls[0][0]).toBe(
      'https://ourworldindata.org/grapher/seawater-ph.csv' +
        '?v=1&csvType=filtered&useColumnShortNames=true&tab=chart&country=OWID_WRL',
    );
    expect(fetchStub.mock.calls[1][0]).toBe(
      'https://ourworldindata.org/grapher/other-chart.csv' +
        '?v=1&csvType=filtered&useColumnShortNames=true',
    );
  });

  it.each([
    ['an invalid slug', 'Bad Slug', { columns: ['v'] }],
    ['an invalid tab', 'chart', { columns: ['v'], tab: 'bogus' as never }],
    ['an invalid country code', 'chart', { columns: ['v'], country: ['bad code'] }],
  ])(
    'should throw OwidInvalidParameterError for %s before the network',
    async (_, slug, options) => {
      const fetchStub = jest.fn();
      const client = await buildClient(fetchStub);

      await expect(client.getGrapherDatedSeries(slug, options)).rejects.toBeInstanceOf(
        OwidInvalidParameterError,
      );
      expect(fetchStub).not.toHaveBeenCalled();
    },
  );

  it('should throw OwidParseError for a non-ISO date', async () => {
    const client = await buildClient(serving('entity,day,v\nHawaii,12345,1\n'));

    await expect(client.getGrapherDatedSeries('chart', { columns: ['v'] })).rejects.toBeInstanceOf(
      OwidParseError,
    );
  });

  it('should throw OwidParseError for an impossible calendar date', async () => {
    const client = await buildClient(serving('entity,day,v\nHawaii,2021-02-31,1\n'));

    await expect(client.getGrapherDatedSeries('chart', { columns: ['v'] })).rejects.toBeInstanceOf(
      OwidParseError,
    );
  });

  it('should throw OwidParseError naming a requested column missing from the header', async () => {
    const client = await buildClient(serving(PH_FIXTURE));

    await expect(
      client.getGrapherDatedSeries('seawater-ph', { columns: ['ocean_ph', 'nope'] }),
    ).rejects.toThrow(/"nope"/);
  });

  it.each([
    ['no rows', 'entity,day,v\n'],
    ['an empty body', ''],
    ['a non-numeric cell', 'entity,day,v\nHawaii,2020-01-01,abc\n'],
    ['a row with the wrong column count', 'entity,day,v\nHawaii,2020-01-01\n'],
    ['a year-indexed header', 'entity,code,year,v\nHawaii,HI,2020,1\n'],
    ['two entities', 'entity,day,v\nHawaii,2020-01-01,1\nOther,2020-01-02,2\n'],
    ['an unterminated quote', 'entity,day,v\n"Hawaii,2020-01-01,1\n'],
  ])('should throw OwidParseError for %s', async (_, body) => {
    const client = await buildClient(serving(body));

    await expect(client.getGrapherDatedSeries('chart', { columns: ['v'] })).rejects.toBeInstanceOf(
      OwidParseError,
    );
  });

  it('should name the chart in the error message', async () => {
    const client = await buildClient(serving('entity,day,v\n'));

    await expect(client.getGrapherDatedSeries('seawater-ph', { columns: ['v'] })).rejects.toThrow(
      'OWID chart "seawater-ph"',
    );
  });

  it('should download once for repeated and different column selections', async () => {
    const fetchStub = serving(PH_FIXTURE);
    const client = await buildClient(fetchStub);

    await client.getGrapherDatedSeries('seawater-ph', { columns: PH_COLUMNS });
    await client.getGrapherDatedSeries('seawater-ph', { columns: ['ocean_ph'] });

    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('should not share cache entries with getGrapherSeries and return copies', async () => {
    const fetchStub = jest.fn().mockImplementation(() => Promise.resolve(text(PH_FIXTURE)));
    const client = await buildClient(fetchStub);

    const first = await client.getGrapherDatedSeries('seawater-ph', { columns: PH_COLUMNS });
    first.rows[0].values[1] = 99;
    first.rows.pop();
    const second = await client.getGrapherDatedSeries('seawater-ph', { columns: PH_COLUMNS });

    expect(second.rows[0].values[1]).toBe(8.1097);
    expect(second.rows.length).toBe(first.rows.length + 1);

    // The year-indexed method keeps its own namespace and its strict header check.
    await expect(
      client.getGrapherSeries('seawater-ph', { column: 'ocean_ph' }),
    ).rejects.toBeInstanceOf(OwidParseError);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });
});

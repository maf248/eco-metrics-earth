import { readFileSync } from 'fs';
import { join } from 'path';

import { Test } from '@nestjs/testing';

import { OUTBOUND_FETCH } from '../../../src/common/http/outbound-http-client.service';
import {
  OutboundHttpStatusError,
  OutboundTimeoutError,
} from '../../../src/common/http/outbound-http-errors';
import { AppConfigService } from '../../../src/config/app-config.service';
import { OwidClient } from '../../../src/modules/providers/owid/owid-client.service';
import {
  OwidInvalidParameterError,
  OwidParseError,
  OwidUnsupportedChartError,
} from '../../../src/modules/providers/owid/owid-errors';
import { OwidModule } from '../../../src/modules/providers/owid/owid.module';

function fixturePath(filename: string): string {
  return join(__dirname, 'fixtures', filename);
}

function loadFixture(filename: string): string {
  return readFileSync(fixturePath(filename), 'utf-8');
}

function loadJsonFixture<T>(filename: string): T {
  return JSON.parse(loadFixture(filename)) as T;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function textResponse(body: string): Response {
  return new Response(body, { status: 200 });
}

describe('OwidClient', () => {
  const grapherBaseUrl = 'https://ourworldindata.org/grapher';
  const apiBaseUrl = 'https://api.ourworldindata.org/v1';

  function buildFetchStub(): jest.Mock {
    return jest.fn();
  }

  function buildAppConfig(): AppConfigService {
    return {
      owidGrapherBaseUrl: grapherBaseUrl,
      owidApiBaseUrl: apiBaseUrl,
      owidHttpTimeoutMs: 10000,
      owidCacheTtlSeconds: 60,
    } as AppConfigService;
  }

  async function buildClient(fetchStub: jest.Mock): Promise<OwidClient> {
    const moduleRef = await Test.createTestingModule({
      imports: [OwidModule],
    })
      .overrideProvider(OUTBOUND_FETCH)
      .useValue(fetchStub)
      .overrideProvider(AppConfigService)
      .useValue(buildAppConfig())
      .compile();

    return moduleRef.get(OwidClient);
  }

  describe('getIndicatorData', () => {
    it('should return the validated payload', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(jsonResponse(loadJsonFixture('indicator-1146696-data.json')));
      const client = await buildClient(fetchStub);

      const result = await client.getIndicatorData(1146696);

      expect(result.indicatorId).toBe(1146696);
      expect(result.values.length).toBeGreaterThan(0);
      expect(result.values.length).toBe(result.years.length);
      expect(result.values.length).toBe(result.entities.length);
      expect(fetchStub).toHaveBeenCalledTimes(1);
      expect(fetchStub).toHaveBeenCalledWith(
        `${apiBaseUrl}/indicators/1146696.data.json`,
        expect.anything(),
      );
    });

    it('should throw OwidInvalidParameterError for a non-positive indicator id before fetching', async () => {
      const fetchStub = buildFetchStub();
      const client = await buildClient(fetchStub);

      await expect(client.getIndicatorData(0)).rejects.toBeInstanceOf(OwidInvalidParameterError);
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it('should include the indicator id in the invalid parameter error message', async () => {
      const fetchStub = buildFetchStub();
      const client = await buildClient(fetchStub);

      await expect(client.getIndicatorData(0)).rejects.toThrow('0');
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it('should throw OwidParseError naming the indicator when the body is not valid JSON', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse('<html>not json</html>'));
      const client = await buildClient(fetchStub);

      const promise = client.getIndicatorData(1146696);

      await expect(promise).rejects.toBeInstanceOf(OwidParseError);
      await expect(promise).rejects.toThrow('indicator 1146696');
      await expect(promise).rejects.toMatchObject({ cause: expect.any(SyntaxError) });
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('should throw OwidParseError for a JSON payload with the wrong shape', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(jsonResponse({ notValues: [] }));
      const client = await buildClient(fetchStub);

      await expect(client.getIndicatorData(1146696)).rejects.toBeInstanceOf(OwidParseError);
    });

    it('should throw OwidParseError when a year entry is not an integer', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(
        jsonResponse({
          years: [2000, 'not-a-number', 2002],
          entities: [1, 2, 3],
          values: [1.1, 2.2, 3.3],
        }),
      );
      const client = await buildClient(fetchStub);

      const promise = client.getIndicatorData(1146696);
      await expect(promise).rejects.toBeInstanceOf(OwidParseError);
      await expect(promise).rejects.toThrow('year at index 1');
    });

    it('should throw OwidParseError when an entity entry is not an integer', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(
        jsonResponse({
          years: [2000, 2001, 2002],
          entities: [1, 'not-a-number', 3],
          values: [1.1, 2.2, 3.3],
        }),
      );
      const client = await buildClient(fetchStub);

      const promise = client.getIndicatorData(1146696);
      await expect(promise).rejects.toBeInstanceOf(OwidParseError);
      await expect(promise).rejects.toThrow('entity at index 1');
    });

    it('should return a deep copy of cached data', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(jsonResponse(loadJsonFixture('indicator-1146696-data.json')));
      const client = await buildClient(fetchStub);

      const first = await client.getIndicatorData(1146696);
      first.values[0] = 999999;

      const second = await client.getIndicatorData(1146696);
      expect(second.values[0]).not.toBe(999999);
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('should propagate OutboundTimeoutError after retries are exhausted', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
      const client = await buildClient(fetchStub);

      await expect(client.getIndicatorData(1146696)).rejects.toBeInstanceOf(OutboundTimeoutError);
    });

    it('should include the indicator id in the timeout error message', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
      const client = await buildClient(fetchStub);

      await expect(client.getIndicatorData(1146696)).rejects.toThrow('1146696');
    });
  });

  describe('getIndicatorMetadata', () => {
    it('should return the attribution-relevant subset', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(jsonResponse(loadJsonFixture('indicator-1146696-metadata.json')));
      const client = await buildClient(fetchStub);

      const result = await client.getIndicatorMetadata(1146696);

      expect(result.id).toBe(1146696);
      expect(result.name).toBeDefined();
      expect(result.unit).toBeDefined();
      expect(result.shortUnit).toBeDefined();
      expect(result.datasetName).toBeDefined();
      expect(result.datasetVersion).toBeDefined();
      expect(result.timespan).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.entities[0]).toHaveProperty('id');
      expect(result.entities[0]).toHaveProperty('name');
      expect(result.entities[0]).toHaveProperty('code');
      expect(fetchStub).toHaveBeenCalledWith(
        `${apiBaseUrl}/indicators/1146696.metadata.json`,
        expect.anything(),
      );
    });

    it('should throw OwidParseError when the metadata payload is malformed', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(jsonResponse({ id: 'not-a-number' }));
      const client = await buildClient(fetchStub);

      const promise = client.getIndicatorMetadata(1146696);

      await expect(promise).rejects.toBeInstanceOf(OwidParseError);
      await expect(promise).rejects.toThrow('OWID indicator 1146696');
    });

    it('should throw OwidParseError when the metadata body is not valid JSON', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse('not json'));
      const client = await buildClient(fetchStub);

      await expect(client.getIndicatorMetadata(1146696)).rejects.toBeInstanceOf(OwidParseError);
    });
  });

  describe('getGrapherSeries', () => {
    it('should parse CSV into sorted per-entity series', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse(loadFixture('co-emissions-per-capita.csv')));
      const client = await buildClient(fetchStub);

      const result = await client.getGrapherSeries('co-emissions-per-capita', {
        country: ['ARG', 'USA'],
        timeRange: { from: 1990, to: 1992 },
      });

      expect(result).toHaveLength(2);
      const argSeries = result.find((s) => s.entityCode === 'ARG');
      expect(argSeries).toBeDefined();
      expect(argSeries?.points).toEqual([
        { year: 1990, value: 3.424979 },
        { year: 1991, value: 3.5427592 },
        { year: 1992, value: 3.606454 },
      ]);
    });

    it('should build the Grapher URL with the required parameters', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse(loadFixture('co-emissions-per-capita.csv')));
      const client = await buildClient(fetchStub);

      await client.getGrapherSeries('co-emissions-per-capita', {
        country: ['ARG', 'USA'],
        timeRange: { from: 1990, to: 1992 },
      });

      const [url] = fetchStub.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('csvType=filtered');
      expect(url).toContain('useColumnShortNames=true');
      expect(url).toContain('v=1');
      expect(url).toContain('country=ARG~USA');
      expect(url).toContain('time=1990..1992');
    });

    it('should omit country and time parameters when options are not provided', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse(loadFixture('co-emissions-per-capita.csv')));
      const client = await buildClient(fetchStub);

      await client.getGrapherSeries('co-emissions-per-capita');

      const [url] = fetchStub.mock.calls[0] as [string, RequestInit];
      expect(url).not.toContain('country=');
      expect(url).not.toContain('time=');
    });

    it('should throw OwidInvalidParameterError for an invalid slug before fetching', async () => {
      const fetchStub = buildFetchStub();
      const client = await buildClient(fetchStub);

      await expect(client.getGrapherSeries('Bad_Slug!')).rejects.toBeInstanceOf(
        OwidInvalidParameterError,
      );
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it('should include the slug in the invalid parameter error message', async () => {
      const fetchStub = buildFetchStub();
      const client = await buildClient(fetchStub);

      await expect(client.getGrapherSeries('Bad_Slug!')).rejects.toThrow('Bad_Slug!');
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it('should throw OwidInvalidParameterError for a lowercase country code before fetching', async () => {
      const fetchStub = buildFetchStub();
      const client = await buildClient(fetchStub);

      await expect(
        client.getGrapherSeries('co-emissions-per-capita', { country: ['arg'] }),
      ).rejects.toBeInstanceOf(OwidInvalidParameterError);
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it('should throw OwidInvalidParameterError for a reversed time range before fetching', async () => {
      const fetchStub = buildFetchStub();
      const client = await buildClient(fetchStub);

      await expect(
        client.getGrapherSeries('co-emissions-per-capita', {
          timeRange: { from: 2020, to: 1990 },
        }),
      ).rejects.toBeInstanceOf(OwidInvalidParameterError);
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it('should serve a cache hit without invoking the transport again', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse(loadFixture('co-emissions-per-capita.csv')));
      const client = await buildClient(fetchStub);

      await client.getGrapherSeries('co-emissions-per-capita', {
        country: ['ARG', 'USA'],
        timeRange: { from: 1990, to: 1992 },
      });
      await client.getGrapherSeries('co-emissions-per-capita', {
        country: ['ARG', 'USA'],
        timeRange: { from: 1990, to: 1992 },
      });

      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('should share one cache entry for the same countries in any order or with duplicates', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockImplementation(() =>
        Promise.resolve(textResponse(loadFixture('co-emissions-per-capita.csv'))),
      );
      const client = await buildClient(fetchStub);

      await client.getGrapherSeries('co-emissions-per-capita', { country: ['USA', 'ARG'] });
      await client.getGrapherSeries('co-emissions-per-capita', { country: ['ARG', 'USA', 'ARG'] });

      expect(fetchStub).toHaveBeenCalledTimes(1);
      const [url] = fetchStub.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('country=ARG~USA');
    });

    it('should treat an empty country list the same as omitting it', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockImplementation(() =>
        Promise.resolve(textResponse(loadFixture('co-emissions-per-capita.csv'))),
      );
      const client = await buildClient(fetchStub);

      await client.getGrapherSeries('co-emissions-per-capita', { country: [] });
      await client.getGrapherSeries('co-emissions-per-capita');

      expect(fetchStub).toHaveBeenCalledTimes(1);
      const [url] = fetchStub.mock.calls[0] as [string, RequestInit];
      expect(url).not.toContain('country=');
    });

    it('should return a deep copy so consumer mutation does not affect cache', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse(loadFixture('co-emissions-per-capita.csv')));
      const client = await buildClient(fetchStub);

      const first = await client.getGrapherSeries('co-emissions-per-capita', {
        country: ['ARG', 'USA'],
        timeRange: { from: 1990, to: 1992 },
      });
      first[0].points[0].value = 999999;

      const second = await client.getGrapherSeries('co-emissions-per-capita', {
        country: ['ARG', 'USA'],
        timeRange: { from: 1990, to: 1992 },
      });
      expect(second[0].points[0].value).not.toBe(999999);
    });

    it('should propagate OutboundHttpStatusError for an upstream 404 without retry', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(new Response('not found', { status: 404 }));
      const client = await buildClient(fetchStub);

      const promise = client.getGrapherSeries('does-not-exist');

      await expect(promise).rejects.toBeInstanceOf(OutboundHttpStatusError);
      await expect(promise).rejects.toMatchObject({ status: 404 });
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('should include the chart slug in the error message for an upstream 404', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(new Response('not found', { status: 404 }));
      const client = await buildClient(fetchStub);

      await expect(client.getGrapherSeries('does-not-exist')).rejects.toThrow('does-not-exist');
    });

    it('should throw OwidUnsupportedChartError for a multi-column chart without column selection', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse(loadFixture('temperature-anomaly.csv')));
      const client = await buildClient(fetchStub);

      await expect(client.getGrapherSeries('temperature-anomaly')).rejects.toBeInstanceOf(
        OwidUnsupportedChartError,
      );
    });

    it('should map the selected column for a multi-column chart', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse(loadFixture('temperature-anomaly.csv')));
      const client = await buildClient(fetchStub);

      const result = await client.getGrapherSeries('temperature-anomaly', {
        country: ['OWID_WRL'],
        timeRange: { from: 1990, to: 1992 },
        column: 'near_surface_temperature_anomaly_lower',
      });

      expect(result[0].points[0]).toEqual({ year: 1990, value: 0.68379974 });
    });

    it('should serve different column selections from a single download', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockImplementation(() =>
        Promise.resolve(textResponse(loadFixture('temperature-anomaly.csv'))),
      );
      const client = await buildClient(fetchStub);

      const first = await client.getGrapherSeries('temperature-anomaly', {
        country: ['OWID_WRL'],
        timeRange: { from: 1990, to: 1992 },
        column: 'near_surface_temperature_anomaly',
      });
      const second = await client.getGrapherSeries('temperature-anomaly', {
        country: ['OWID_WRL'],
        timeRange: { from: 1990, to: 1992 },
        column: 'near_surface_temperature_anomaly_lower',
      });

      expect(first[0].points[0]).toEqual({ year: 1990, value: 0.7190031 });
      expect(second[0].points[0]).toEqual({ year: 1990, value: 0.68379974 });
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('should return cached payload for repeated calls with the same column', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockImplementation(() =>
        Promise.resolve(textResponse(loadFixture('temperature-anomaly.csv'))),
      );
      const client = await buildClient(fetchStub);

      await client.getGrapherSeries('temperature-anomaly', {
        country: ['OWID_WRL'],
        timeRange: { from: 1990, to: 1992 },
        column: 'near_surface_temperature_anomaly',
      });
      await client.getGrapherSeries('temperature-anomaly', {
        country: ['OWID_WRL'],
        timeRange: { from: 1990, to: 1992 },
        column: 'near_surface_temperature_anomaly',
      });

      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('should throw OwidInvalidParameterError listing available columns for an unknown column', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse(loadFixture('temperature-anomaly.csv')));
      const client = await buildClient(fetchStub);

      const promise = client.getGrapherSeries('temperature-anomaly', { column: 'wrong_column' });
      await expect(promise).rejects.toBeInstanceOf(OwidInvalidParameterError);
      await expect(promise).rejects.toThrow('near_surface_temperature_anomaly');
    });

    it('should not download again when a cached chart is requested with an unknown column', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockImplementation(() =>
        Promise.resolve(textResponse(loadFixture('temperature-anomaly.csv'))),
      );
      const client = await buildClient(fetchStub);

      await client.getGrapherSeries('temperature-anomaly', {
        column: 'near_surface_temperature_anomaly',
      });
      await expect(
        client.getGrapherSeries('temperature-anomaly', { column: 'wrong_column' }),
      ).rejects.toBeInstanceOf(OwidInvalidParameterError);

      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('should name the chart slug in parse errors while preserving the error class', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse('wrong,header\nA,B\n'));
      const client = await buildClient(fetchStub);

      const promise = client.getGrapherSeries('co-emissions-per-capita');

      await expect(promise).rejects.toBeInstanceOf(OwidParseError);
      await expect(promise).rejects.toThrow('OWID chart "co-emissions-per-capita"');
      await expect(promise).rejects.toMatchObject({ cause: expect.any(OwidParseError) });
    });
  });

  describe('parameter validation', () => {
    it.each([
      ['a non-array country option', { country: 'ARG' as unknown as string[] }],
      ['a non-string country code', { country: [42 as unknown as string] }],
      ['a non-integer time range bound', { timeRange: { from: 1990.5, to: 2020 } }],
    ])('should reject %s before fetching', async (_label, options) => {
      const fetchStub = buildFetchStub();
      const client = await buildClient(fetchStub);

      await expect(
        client.getGrapherSeries('co-emissions-per-capita', options),
      ).rejects.toBeInstanceOf(OwidInvalidParameterError);
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it('should reject a non-integer indicator id before fetching', async () => {
      const fetchStub = buildFetchStub();
      const client = await buildClient(fetchStub);

      await expect(client.getIndicatorData(1.5)).rejects.toBeInstanceOf(OwidInvalidParameterError);
      expect(fetchStub).not.toHaveBeenCalled();
    });
  });

  describe('indicator data payload validation', () => {
    // Raw JSON bodies: `1e999` parses to Infinity, which JSON.stringify cannot produce.
    it.each([
      ['a null body', 'null', 'expected an object'],
      [
        'arrays of unequal length',
        '{"years":[2000,2001],"entities":[1],"values":[1.1,2.2]}',
        'unequal lengths',
      ],
      [
        'a non-numeric value',
        '{"years":[2000],"entities":[1],"values":["not-a-number"]}',
        'value at index 0',
      ],
      [
        'a non-finite value',
        '{"years":[2000],"entities":[1],"values":[1e999]}',
        'value at index 0',
      ],
    ])('should throw OwidParseError for %s', async (_label, body, message) => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(textResponse(body));
      const client = await buildClient(fetchStub);

      const promise = client.getIndicatorData(1146696);
      await expect(promise).rejects.toBeInstanceOf(OwidParseError);
      await expect(promise).rejects.toThrow(message);
    });

    it('should accept null values as missing data points', async () => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(
        jsonResponse({ years: [2000, 2001], entities: [1, 1], values: [null, 2.5] }),
      );
      const client = await buildClient(fetchStub);

      const result = await client.getIndicatorData(1146696);

      expect(result.values).toEqual([null, 2.5]);
    });
  });

  describe('indicator metadata payload validation', () => {
    function validMetadata(): Record<string, unknown> {
      return loadJsonFixture<Record<string, unknown>>('indicator-1146696-metadata.json');
    }

    it.each([
      ['a null body', () => null, 'expected an object'],
      [
        'a missing string field',
        () => ({ ...validMetadata(), unit: undefined }),
        'missing or invalid field "unit"',
      ],
      [
        'missing dimensions',
        () => ({ ...validMetadata(), dimensions: undefined }),
        'missing dimensions object',
      ],
      [
        'missing dimensions.entities',
        () => ({ ...validMetadata(), dimensions: {} }),
        'missing dimensions.entities object',
      ],
      [
        'non-array entity values',
        () => ({ ...validMetadata(), dimensions: { entities: { values: 'ARG' } } }),
        'dimensions.entities.values is not an array',
      ],
      [
        'a non-object entity',
        () => ({ ...validMetadata(), dimensions: { entities: { values: ['ARG'] } } }),
        'entity at index 0 is not an object',
      ],
      [
        'an entity without a code',
        () => ({
          ...validMetadata(),
          dimensions: { entities: { values: [{ id: 21, name: 'Argentina' }] } },
        }),
        'entity at index 0 is missing id, name, or code',
      ],
    ])('should throw OwidParseError for %s', async (_label, buildBody, message) => {
      const fetchStub = buildFetchStub();
      fetchStub.mockResolvedValue(jsonResponse(buildBody()));
      const client = await buildClient(fetchStub);

      const promise = client.getIndicatorMetadata(1146696);
      await expect(promise).rejects.toBeInstanceOf(OwidParseError);
      await expect(promise).rejects.toThrow(message);
      await expect(promise).rejects.toThrow('OWID indicator 1146696');
    });
  });
});

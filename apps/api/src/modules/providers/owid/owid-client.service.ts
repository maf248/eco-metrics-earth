import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

import type { MetricSeries } from '@eco-metrics/shared';

import { OutboundHttpClient } from '../../../common/http/outbound-http-client.service';
import { AppConfigService } from '../../../config/app-config.service';

import { OwidClientError, OwidInvalidParameterError, OwidParseError } from './owid-errors';
import type {
  OwidGrapherSeriesOptions,
  OwidIndicatorData,
  OwidIndicatorMetadata,
  OwidIndicatorMetadataEntity,
} from './owid.types';
import { type GrapherTable, parseGrapherTable, selectGrapherColumn } from './parseGrapherCsv';

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const COUNTRY_CODE_PATTERN = /^[A-Z0-9_]+$/;

function validateSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new OwidInvalidParameterError(
      `Invalid OWID grapher slug "${slug}". Slug must be a non-empty lowercase kebab string.`,
    );
  }
}

function validateCountryCodes(country: string[] | undefined): void {
  if (country === undefined) {
    return;
  }

  if (!Array.isArray(country)) {
    throw new OwidInvalidParameterError(
      'Invalid country option: must be an array of entity codes.',
    );
  }

  for (const code of country) {
    if (typeof code !== 'string' || !COUNTRY_CODE_PATTERN.test(code)) {
      throw new OwidInvalidParameterError(
        `Invalid country code "${String(code)}". Codes must match the OWID entity code format.`,
      );
    }
  }
}

function validateTimeRange(timeRange: { from: number; to: number } | undefined): void {
  if (timeRange === undefined) {
    return;
  }

  const { from, to } = timeRange;
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    throw new OwidInvalidParameterError(
      `Invalid timeRange: from (${String(from)}) and to (${String(to)}) must be integers.`,
    );
  }

  if (from > to) {
    throw new OwidInvalidParameterError(
      `Invalid timeRange: from (${from}) cannot be greater than to (${to}).`,
    );
  }
}

function validateIndicatorId(indicatorId: number): void {
  if (!Number.isInteger(indicatorId) || indicatorId <= 0) {
    throw new OwidInvalidParameterError(
      `Invalid indicator id "${String(indicatorId)}". Must be a positive integer.`,
    );
  }
}

function validateIndicatorData(data: unknown, indicatorId: number): OwidIndicatorData {
  if (!data || typeof data !== 'object') {
    throw new OwidParseError(
      `Malformed indicator data response for id ${indicatorId}: expected an object.`,
    );
  }

  const payload = data as Record<string, unknown>;
  const { values, years, entities } = payload;

  if (!Array.isArray(values) || !Array.isArray(years) || !Array.isArray(entities)) {
    throw new OwidParseError(
      `Malformed indicator data response for id ${indicatorId}: missing values, years, or entities arrays.`,
    );
  }

  if (values.length !== years.length || values.length !== entities.length) {
    throw new OwidParseError(
      `Malformed indicator data response for id ${indicatorId}: values, years, and entities arrays have unequal lengths.`,
    );
  }

  const validatedYears: number[] = [];
  const validatedEntities: number[] = [];
  const validatedValues: (number | null)[] = [];

  for (let i = 0; i < values.length; i++) {
    const year = years[i];
    const entity = entities[i];
    const value = values[i];

    if (typeof year !== 'number' || !Number.isInteger(year)) {
      throw new OwidParseError(
        `Malformed indicator data response for id ${indicatorId}: year at index ${i} is not an integer.`,
      );
    }

    if (typeof entity !== 'number' || !Number.isInteger(entity)) {
      throw new OwidParseError(
        `Malformed indicator data response for id ${indicatorId}: entity at index ${i} is not an integer.`,
      );
    }

    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new OwidParseError(
        `Malformed indicator data response for id ${indicatorId}: value at index ${i} is not a finite number or null.`,
      );
    }

    validatedYears.push(year);
    validatedEntities.push(entity);
    validatedValues.push(value);
  }

  return {
    indicatorId,
    years: validatedYears,
    entities: validatedEntities,
    values: validatedValues,
  };
}

function validateIndicatorMetadata(data: unknown, indicatorId: number): OwidIndicatorMetadata {
  try {
    return parseIndicatorMetadata(data);
  } catch (error) {
    if (error instanceof OwidClientError) {
      throw error.withContext(`OWID indicator ${indicatorId}`);
    }
    throw error;
  }
}

function parseIndicatorMetadata(data: unknown): OwidIndicatorMetadata {
  if (!data || typeof data !== 'object') {
    throw new OwidParseError('Malformed indicator metadata response: expected an object.');
  }

  const payload = data as Record<string, unknown>;
  const requiredStringFields = [
    'name',
    'unit',
    'shortUnit',
    'datasetName',
    'datasetVersion',
    'timespan',
    'updatedAt',
  ] as const;

  for (const field of requiredStringFields) {
    if (typeof payload[field] !== 'string') {
      throw new OwidParseError(
        `Malformed indicator metadata response: missing or invalid field "${field}".`,
      );
    }
  }

  if (typeof payload.id !== 'number') {
    throw new OwidParseError(
      'Malformed indicator metadata response: missing or invalid field "id".',
    );
  }

  const dimensions = payload.dimensions as Record<string, unknown> | undefined;
  if (!dimensions || typeof dimensions !== 'object') {
    throw new OwidParseError('Malformed indicator metadata response: missing dimensions object.');
  }

  const entitiesDimension = dimensions.entities as Record<string, unknown> | undefined;
  if (!entitiesDimension || typeof entitiesDimension !== 'object') {
    throw new OwidParseError(
      'Malformed indicator metadata response: missing dimensions.entities object.',
    );
  }

  const entityValues = entitiesDimension.values;
  if (!Array.isArray(entityValues)) {
    throw new OwidParseError(
      'Malformed indicator metadata response: dimensions.entities.values is not an array.',
    );
  }

  const entities: OwidIndicatorMetadataEntity[] = [];
  for (let i = 0; i < entityValues.length; i++) {
    const item = entityValues[i];
    if (!item || typeof item !== 'object') {
      throw new OwidParseError(
        `Malformed indicator metadata response: entity at index ${i} is not an object.`,
      );
    }

    const entity = item as Record<string, unknown>;
    if (
      typeof entity.id !== 'number' ||
      typeof entity.name !== 'string' ||
      typeof entity.code !== 'string'
    ) {
      throw new OwidParseError(
        `Malformed indicator metadata response: entity at index ${i} is missing id, name, or code.`,
      );
    }

    entities.push({
      id: entity.id,
      name: entity.name,
      code: entity.code,
    });
  }

  return {
    id: payload.id,
    name: payload.name as string,
    unit: payload.unit as string,
    shortUnit: payload.shortUnit as string,
    datasetName: payload.datasetName as string,
    datasetVersion: payload.datasetVersion as string,
    timespan: payload.timespan as string,
    updatedAt: payload.updatedAt as string,
    entities,
  };
}

// Sorted and de-duplicated so equivalent selections share one cache entry and
// one request; an empty list means no country filter, same as omitting it.
function normalizeCountries(country: string[] | undefined): string[] {
  return [...new Set(country ?? [])].sort();
}

// The column is deliberately not part of the key: the cached table keeps every
// value column, so one download serves any column selection.
function buildGrapherCacheKey(slug: string, options: OwidGrapherSeriesOptions): string {
  const countries = normalizeCountries(options.country);
  const country = countries.length > 0 ? countries.join('~') : 'all';
  const time = options.timeRange ? `${options.timeRange.from}..${options.timeRange.to}` : 'all';
  return `owid:grapher:${slug}:c=${country}:t=${time}`;
}

function buildGrapherUrl(baseUrl: string, slug: string, options: OwidGrapherSeriesOptions): string {
  const params: string[] = ['v=1', 'csvType=filtered', 'useColumnShortNames=true'];

  const countries = normalizeCountries(options.country);
  if (countries.length > 0) {
    params.push(`country=${countries.join('~')}`);
  }

  if (options.timeRange) {
    params.push(`time=${options.timeRange.from}..${options.timeRange.to}`);
  }

  return `${baseUrl}/${slug}.csv?${params.join('&')}`;
}

@Injectable()
export class OwidClient {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly httpClient: OutboundHttpClient,
    private readonly appConfig: AppConfigService,
  ) {}

  async getIndicatorData(indicatorId: number): Promise<OwidIndicatorData> {
    validateIndicatorId(indicatorId);

    const key = `owid:indicator-data:${indicatorId}`;
    const url = `${this.appConfig.owidApiBaseUrl}/indicators/${indicatorId}.data.json`;

    const payload = await this.cache.wrap<OwidIndicatorData>(key, async () => {
      const data = await this.fetchJson(url, `indicator ${indicatorId} data`);
      return validateIndicatorData(data, indicatorId);
    });

    return structuredClone(payload);
  }

  async getIndicatorMetadata(indicatorId: number): Promise<OwidIndicatorMetadata> {
    validateIndicatorId(indicatorId);

    const key = `owid:indicator-metadata:${indicatorId}`;
    const url = `${this.appConfig.owidApiBaseUrl}/indicators/${indicatorId}.metadata.json`;

    const payload = await this.cache.wrap<OwidIndicatorMetadata>(key, async () => {
      const data = await this.fetchJson(url, `indicator ${indicatorId} metadata`);
      return validateIndicatorMetadata(data, indicatorId);
    });

    return structuredClone(payload);
  }

  async getGrapherSeries(
    slug: string,
    options: OwidGrapherSeriesOptions = {},
  ): Promise<MetricSeries[]> {
    validateSlug(slug);
    validateCountryCodes(options.country);
    validateTimeRange(options.timeRange);

    const key = buildGrapherCacheKey(slug, options);
    const url = buildGrapherUrl(this.appConfig.owidGrapherBaseUrl, slug, options);

    try {
      const table = await this.cache.wrap<GrapherTable>(key, async () =>
        parseGrapherTable(await this.httpClient.getText(url)),
      );
      // selectGrapherColumn builds fresh objects, so the result never shares
      // references with the cached table.
      return selectGrapherColumn(table, options.column);
    } catch (error) {
      if (error instanceof OwidClientError) {
        throw error.withContext(`OWID chart "${slug}"`);
      }
      throw error;
    }
  }

  private async fetchJson(url: string, resource: string): Promise<unknown> {
    try {
      return await this.httpClient.getJson(url);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new OwidParseError(`Malformed JSON response for OWID ${resource}.`, {
          cause: error,
        });
      }
      throw error;
    }
  }
}

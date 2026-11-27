import { readFileSync } from 'fs';
import { join } from 'path';

import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { of } from 'rxjs';

import {
  type MetricSeries,
  TREE_COVER_LOSS_DRIVER_IDS,
  type TreeCoverLossDriverId,
  listCountryEntityCodes,
} from '@eco-metrics/shared';

import { AppModule } from '../../src/app/app.module';
import { applyGlobalPipeline } from '../../src/app/global-pipeline';
import { OUTBOUND_FETCH } from '../../src/common/http/outbound-http-client.service';
import { TREE_COVER_LOSS_COLUMNS } from '../../src/modules/deforestation/deforestation.constants';
import type { BuildForestAreaInput } from '../../src/modules/deforestation/forest-area.service';
import type { BuildTreeCoverLossInput } from '../../src/modules/deforestation/tree-cover-loss.service';
import type { OwidIndicatorMetadata } from '../../src/modules/providers/owid/owid.types';
import {
  parseGrapherTable,
  selectGrapherColumn,
} from '../../src/modules/providers/owid/parseGrapherCsv';

const FIXTURES = join(__dirname, 'fixtures');

export function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

export type Route = (url: string) => Response;

/** The routes of the three charts and three indicators, answering with the committed fixtures. */
export const okRoutes: Route = (url) => {
  for (const slug of [
    'forest-area-km',
    'forest-area-as-share-of-land-area',
    'tree-cover-loss-by-dominant-driver',
  ]) {
    if (url.includes(`/grapher/${slug}.csv`)) {
      return new Response(fixture(`${slug}.csv`), { status: 200 });
    }
  }
  for (const id of [1129226, 1132530, 1104660]) {
    if (url.includes(`/indicators/${id}.metadata.json`)) {
      return new Response(fixture(`indicator-${id}-metadata.json`), { status: 200 });
    }
  }
  return new Response('not found', { status: 404 });
};

/** Answers like `okRoutes`, except for the URLs containing `urlPart`, which fail with a 404. */
export function failing(urlPart: string): Route {
  return (url) =>
    url.includes(urlPart) ? new Response('not found', { status: 404 }) : okRoutes(url);
}

/** Answers like `okRoutes`, except for the URLs containing `urlPart`, which get `body`. */
export function replacing(urlPart: string, body: string): Route {
  return (url) => (url.includes(urlPart) ? new Response(body, { status: 200 }) : okRoutes(url));
}

export async function createApp(
  route: Route,
  override?: (builder: TestingModuleBuilder) => void,
): Promise<{ app: INestApplication; fetchStub: jest.Mock }> {
  const fetchStub = jest.fn((input: string | URL) => Promise.resolve(route(String(input))));
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(OUTBOUND_FETCH)
    .useValue(fetchStub)
    .overrideProvider(HttpService)
    .useValue({ request: () => of({ status: 200, data: {} }) });
  override?.(builder);
  const moduleRef: TestingModule = await builder.compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  applyGlobalPipeline(app);
  await app.init();
  return { app, fetchStub };
}

/** Freezes only the calendar: timers, sockets and microtasks keep running. */
export function useClock(isoDate: string): void {
  jest.useFakeTimers({
    now: new Date(isoDate),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
}

/** Silences the expected error and warning logs of provider failures in a test. */
export function silenceLogger(): jest.SpyInstance[] {
  return [
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined),
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined),
  ];
}

export function fixtureMetadata(id: number): OwidIndicatorMetadata {
  const raw = JSON.parse(fixture(`indicator-${id}-metadata.json`)) as Record<string, unknown> & {
    dimensions: { entities: { values: OwidIndicatorMetadata['entities'] } };
  };
  return {
    id: raw.id as number,
    name: raw.name as string,
    unit: raw.unit as string,
    shortUnit: raw.shortUnit as string,
    datasetName: raw.datasetName as string,
    datasetVersion: raw.datasetVersion as string,
    timespan: raw.timespan as string,
    updatedAt: raw.updatedAt as string,
    descriptionShort: raw.descriptionShort as string,
    entities: raw.dimensions.entities.values,
  };
}

function series(csv: string, column: string): MetricSeries[] {
  return selectGrapherColumn(parseGrapherTable(fixture(csv)), column);
}

export function forestAreaInput(): BuildForestAreaInput {
  return {
    area: series('forest-area-km.csv', '_1a_forestarea'),
    share: series('forest-area-as-share-of-land-area.csv', 'forest_share'),
    areaMetadata: fixtureMetadata(1129226),
    shareMetadata: fixtureMetadata(1132530),
    allowedCodes: new Set(listCountryEntityCodes()),
  };
}

export function treeCoverLossInput(): BuildTreeCoverLossInput {
  const table = parseGrapherTable(fixture('tree-cover-loss-by-dominant-driver.csv'));
  return {
    drivers: Object.fromEntries(
      TREE_COVER_LOSS_DRIVER_IDS.map((id) => [
        id,
        selectGrapherColumn(table, TREE_COVER_LOSS_COLUMNS[id]),
      ]),
    ) as Record<TreeCoverLossDriverId, MetricSeries[]>,
    metadata: fixtureMetadata(1104660),
    allowedCodes: new Set(listCountryEntityCodes()),
  };
}

/** A one-entity synthetic series, one point per `[year, value]` pair. */
export function syntheticSeries(
  code: string,
  name: string,
  points: [number, number | null][],
): MetricSeries {
  return {
    entityCode: code,
    entityName: name,
    points: points.map(([year, value]) => ({ year, value })),
  };
}

import { readFileSync } from 'fs';
import { join } from 'path';

import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { of } from 'rxjs';

import { AppModule } from '../../src/app/app.module';
import { applyGlobalPipeline } from '../../src/app/global-pipeline';
import { OUTBOUND_FETCH } from '../../src/common/http/outbound-http-client.service';

const FIXTURES = join(__dirname, 'fixtures');

export function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

export function jsonFixture<T>(name: string): T {
  return JSON.parse(fixture(name)) as T;
}

export type Route = (url: string) => Response;

/** The routes of every provider, answering with the committed fixtures. */
export const okRoutes: Route = (url) => {
  if (url.includes('/grapher/sea-surface-temperature-anomaly.csv')) {
    return new Response(fixture('sea-surface-temperature-anomaly.csv'), { status: 200 });
  }
  if (url.includes('/grapher/ocean-heat-content-upper.csv')) {
    return new Response(fixture('ocean-heat-content-upper.csv'), { status: 200 });
  }
  if (url.includes('/grapher/ocean-heat-top-2000m.csv')) {
    return new Response(fixture('ocean-heat-top-2000m.csv'), { status: 200 });
  }
  if (url.includes('/grapher/seawater-ph.csv')) {
    return new Response(fixture('seawater-ph.csv'), { status: 200 });
  }
  for (const id of [1357160, 1357159, 1357158, 1357137]) {
    if (url.includes(`/indicators/${id}.metadata.json`)) {
      return new Response(fixture(`indicator-${id}-metadata.json`), { status: 200 });
    }
  }
  if (url.includes('era5_daily_series_sst_60S-60N_ocean.csv')) {
    return new Response(fixture('era5_daily_series_sst_60S-60N_ocean.csv'), { status: 200 });
  }
  if (url.includes('slr_sla_gbl_free_ref_90.csv')) {
    return new Response(fixture('slr_sla_gbl_free_ref_90.csv'), { status: 200 });
  }
  return new Response('not found', { status: 404 });
};

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

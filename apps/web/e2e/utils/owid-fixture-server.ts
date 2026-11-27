import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';

interface FixtureRoute {
  file: string;
  contentType: string;
}

/**
 * The provider endpoints the API uses, mapped to committed fixtures (`file` is relative to
 * `e2e/fixtures/`). The query string is ignored. Our World in Data is served under `/grapher` and
 * `/v1`, Copernicus Climate Pulse under `/copernicus` and the NOAA Laboratory for Satellite
 * Altimetry under `/noaa-lsa`. Every file keeps the real format, so the real parsers run in E2E.
 */
export const OWID_FIXTURE_ROUTES: Readonly<Record<string, FixtureRoute>> = {
  '/grapher/annual-co2-emissions-per-country.csv': {
    file: 'owid/annual-co2-emissions-per-country.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/co-emissions-per-capita.csv': {
    file: 'owid/co-emissions-per-capita.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/co-emissions-per-capita.metadata.json': {
    file: 'owid/co-emissions-per-capita.metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1119906.metadata.json': {
    file: 'owid/indicator-1119906-metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1119914.metadata.json': {
    file: 'owid/indicator-1119914-metadata.json',
    contentType: 'application/json',
  },
  '/grapher/annual-temperature-anomalies.csv': {
    file: 'owid/annual-temperature-anomalies.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/temperature-anomaly.csv': {
    file: 'owid/temperature-anomaly.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/v1/indicators/1325020.metadata.json': {
    file: 'owid/indicator-1325020-metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1325256.metadata.json': {
    file: 'owid/indicator-1325256-metadata.json',
    contentType: 'application/json',
  },
  '/grapher/electricity-production-by-source.csv': {
    file: 'owid/electricity-production-by-source.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/v1/indicators/1295503.metadata.json': {
    file: 'owid/indicator-1295503-metadata.json',
    contentType: 'application/json',
  },
  '/grapher/sea-surface-temperature-anomaly.csv': {
    file: 'owid/sea-surface-temperature-anomaly.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/ocean-heat-content-upper.csv': {
    file: 'owid/ocean-heat-content-upper.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/ocean-heat-top-2000m.csv': {
    file: 'owid/ocean-heat-top-2000m.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/seawater-ph.csv': {
    file: 'owid/seawater-ph.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/v1/indicators/1357160.metadata.json': {
    file: 'owid/indicator-1357160-metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1357159.metadata.json': {
    file: 'owid/indicator-1357159-metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1357158.metadata.json': {
    file: 'owid/indicator-1357158-metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1357137.metadata.json': {
    file: 'owid/indicator-1357137-metadata.json',
    contentType: 'application/json',
  },
  '/grapher/forest-area-km.csv': {
    file: 'owid/forest-area-km.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/forest-area-as-share-of-land-area.csv': {
    file: 'owid/forest-area-as-share-of-land-area.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/tree-cover-loss-by-dominant-driver.csv': {
    file: 'owid/tree-cover-loss-by-dominant-driver.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/v1/indicators/1129226.metadata.json': {
    file: 'owid/indicator-1129226-metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1132530.metadata.json': {
    file: 'owid/indicator-1132530-metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1104660.metadata.json': {
    file: 'owid/indicator-1104660-metadata.json',
    contentType: 'application/json',
  },
  '/copernicus/era5_daily_series_sst_60S-60N_ocean.csv': {
    file: 'copernicus/era5_daily_series_sst_60S-60N_ocean.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/noaa-lsa/slr_sla_gbl_free_ref_90.csv': {
    file: 'noaa-lsa/slr_sla_gbl_free_ref_90.csv',
    contentType: 'text/csv; charset=utf-8',
  },
};

/** Handles one request; exported so the routes can be unit-tested without a socket. */
export function respondWithFixture(
  url: string | undefined,
  fixturesDir: string,
): {
  status: number;
  contentType: string;
  body: string;
} {
  const pathname = new URL(url ?? '/', 'http://fixture.local').pathname;

  if (pathname === '/') {
    return { status: 200, contentType: 'text/plain', body: 'ok' };
  }

  const route = OWID_FIXTURE_ROUTES[pathname];
  if (!route) {
    return { status: 404, contentType: 'text/plain', body: 'not found' };
  }
  return {
    status: 200,
    contentType: route.contentType,
    body: readFileSync(join(fixturesDir, route.file), 'utf8'),
  };
}

/** Starts the fixture server; rejects when the port is taken so a clash fails fast. */
export function startOwidFixtureServer(port: number, fixturesDir: string): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const { status, contentType, body } = respondWithFixture(request.url, fixturesDir);
      response.writeHead(status, { 'Content-Type': contentType });
      response.end(body);
    });
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

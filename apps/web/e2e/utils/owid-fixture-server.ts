import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';

interface FixtureRoute {
  file: string;
  contentType: string;
}

/**
 * The OWID endpoints the API uses, mapped to committed fixtures. The query string is ignored.
 * The CSVs keep the real format (`entity,code,year,<column>`), so the real parser runs in E2E.
 */
export const OWID_FIXTURE_ROUTES: Readonly<Record<string, FixtureRoute>> = {
  '/grapher/annual-co2-emissions-per-country.csv': {
    file: 'annual-co2-emissions-per-country.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/co-emissions-per-capita.csv': {
    file: 'co-emissions-per-capita.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/co-emissions-per-capita.metadata.json': {
    file: 'co-emissions-per-capita.metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1119906.metadata.json': {
    file: 'indicator-1119906-metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1119914.metadata.json': {
    file: 'indicator-1119914-metadata.json',
    contentType: 'application/json',
  },
  '/grapher/annual-temperature-anomalies.csv': {
    file: 'annual-temperature-anomalies.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/grapher/temperature-anomaly.csv': {
    file: 'temperature-anomaly.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  '/v1/indicators/1325020.metadata.json': {
    file: 'indicator-1325020-metadata.json',
    contentType: 'application/json',
  },
  '/v1/indicators/1325256.metadata.json': {
    file: 'indicator-1325256-metadata.json',
    contentType: 'application/json',
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

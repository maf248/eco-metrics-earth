/**
 * @jest-environment node
 */

import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import {
  OWID_FIXTURE_ROUTES,
  respondWithFixture,
  startOwidFixtureServer,
} from '../../e2e/utils/owid-fixture-server';

const FIXTURES_DIR = join(__dirname, '../../e2e/fixtures/owid');
const respond = (url: string | undefined) => respondWithFixture(url, FIXTURES_DIR);

describe('respondWithFixture', () => {
  it('should answer the root path as ready', () => {
    expect(respond('/')).toEqual({ status: 200, contentType: 'text/plain', body: 'ok' });
  });

  it('should serve both chart CSVs in the real format regardless of the query string', () => {
    const total = respond(
      '/grapher/annual-co2-emissions-per-country.csv?v=1&csvType=filtered&country=ARG',
    );
    const perCapita = respond('/grapher/co-emissions-per-capita.csv');

    expect(total.status).toBe(200);
    expect(total.contentType).toContain('text/csv');
    expect(total.body.split('\n')[0]).toBe('entity,code,year,emissions_total');
    expect(perCapita.body.split('\n')[0]).toBe('entity,code,year,emissions_total_per_capita');
  });

  it('should cover World, Argentina, Kosovo and an entity with null years', () => {
    const { body } = respond('/grapher/annual-co2-emissions-per-country.csv');

    expect(body).toContain(',OWID_WRL,1950,');
    expect(body).toContain(',ARG,2024,');
    expect(body).toContain(',OWID_KOS,');
    expect(body).toContain(',ATA,1987,');
    expect(body).not.toContain(',ATA,1950,');
  });

  it('should include a per-capita value that rounds to zero', () => {
    const { body } = respond('/grapher/co-emissions-per-capita.csv');

    expect(body).toContain('OWID_KOS,1994,0');
  });

  it('should serve the health probe metadata and the indicator metadata as JSON', () => {
    const urls = [
      '/grapher/co-emissions-per-capita.metadata.json',
      '/v1/indicators/1119906.metadata.json',
      '/v1/indicators/1119914.metadata.json',
    ];

    for (const url of urls) {
      const response = respond(url);
      expect(response.status).toBe(200);
      expect(() => JSON.parse(response.body)).not.toThrow();
    }
  });

  it('should serve the temperature chart CSV with World, countries, a null year and negatives', () => {
    const { status, contentType, body } = respond(
      '/grapher/annual-temperature-anomalies.csv?v=1&csvType=filtered&tab=chart',
    );

    expect(status).toBe(200);
    expect(contentType).toContain('text/csv');
    expect(body.split('\n')[0]).toBe('entity,code,year,temperature_anomaly');
    for (const code of ['OWID_WRL', 'ARG', 'USA', 'OWID_KOS']) {
      expect(body).toContain(`,${code},1940,`);
      expect(body).toContain(`,${code},2025,`);
    }
    expect(body).toContain('Argentina,ARG,1960,\n');
    expect(body).toMatch(/OWID_WRL,1940,-/);
  });

  it('should serve the temperature indicator metadata with its short description', () => {
    const { status, body } = respond('/v1/indicators/1325256.metadata.json');

    expect(status).toBe(200);
    const metadata = JSON.parse(body) as Record<string, string>;
    expect(metadata.descriptionShort).toContain('1991-2020');
    expect(metadata.datasetName).toBeTruthy();
    expect(metadata.datasetVersion).toBe('2026-10-12');
    expect(metadata.updatedAt).toBeTruthy();
  });

  it('should serve the HadCRUT5 chart CSV: World with bounds from 1850, a blank bound, hemispheres', () => {
    const { status, contentType, body } = respond(
      '/grapher/temperature-anomaly.csv?v=1&csvType=filtered&tab=chart&country=OWID_WRL',
    );

    expect(status).toBe(200);
    expect(contentType).toContain('text/csv');
    expect(body.split('\n')[0]).toBe(
      'entity,code,year,near_surface_temperature_anomaly,near_surface_temperature_anomaly_lower,near_surface_temperature_anomaly_upper',
    );
    expect(body).toContain('World,OWID_WRL,1850,');
    expect(body).toContain('World,OWID_WRL,2025,');
    expect(body).not.toContain('OWID_WRL,2026,');
    expect(body).toMatch(/World,OWID_WRL,1900,[\d.-]+,,[\d.-]+\n/);
    expect(body).toContain('OWID_NH,');
    expect(body).toContain('OWID_SH,');
  });

  it('should serve the pre-industrial indicator metadata with its baseline description', () => {
    const { status, body } = respond('/v1/indicators/1325020.metadata.json');

    expect(status).toBe(200);
    const metadata = JSON.parse(body) as Record<string, string>;
    expect(metadata.descriptionShort).toContain('1861-1890');
    expect(metadata.datasetName).toBe('Climate Change Impacts - Annual');
    expect(metadata.updatedAt).toBeTruthy();
  });

  it('should answer 404 for anything else', () => {
    expect(respond('/grapher/unknown.csv').status).toBe(404);
  });

  it('should treat a missing url as the root path', () => {
    expect(respond(undefined).status).toBe(200);
  });

  it('should list only existing fixture files', () => {
    for (const url of Object.keys(OWID_FIXTURE_ROUTES)) {
      expect(respond(url).status).toBe(200);
    }
  });
});

describe('startOwidFixtureServer', () => {
  let server: Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      if (server?.listening) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
    server = undefined;
  });

  it('should serve fixtures over HTTP', async () => {
    server = await startOwidFixtureServer(0, FIXTURES_DIR);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://localhost:${port}/grapher/co-emissions-per-capita.csv`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('emissions_total_per_capita');
  });

  it('should reject when the port is already taken', async () => {
    server = await startOwidFixtureServer(0, FIXTURES_DIR);
    const { port } = server.address() as AddressInfo;

    await expect(startOwidFixtureServer(port, FIXTURES_DIR)).rejects.toThrow(/EADDRINUSE/);
  });
});

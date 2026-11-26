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

const FIXTURES_DIR = join(__dirname, '../../e2e/fixtures');
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

  it('should serve the electricity chart CSV: World and countries, blanks, a zeros-only latest row', () => {
    const { status, contentType, body } = respond(
      '/grapher/electricity-production-by-source.csv?v=1&csvType=filtered&time=2000..2026',
    );

    expect(status).toBe(200);
    expect(contentType).toContain('text/csv');
    expect(body.split('\n')[0]).toBe(
      'entity,code,year,coal_generation__twh,gas_generation__twh,nuclear_generation__twh,hydro_generation__twh,solar_generation__twh,oil_generation__twh,wind_generation__twh,bioenergy_generation__twh,other_renewables_excluding_bioenergy_generation__twh',
    );
    for (const code of ['OWID_WRL', 'ARG', 'ESP', 'BIH', 'DZA']) {
      expect(body).toContain(`,${code},2000,`);
    }
    expect(body).toContain('Algeria,DZA,2025,,,0,,,,,,\n');
    expect(body).toMatch(/Bosnia and Herzegovina,BIH,2000,[\d.]+,,/);
    expect(body).not.toMatch(/,(19\d\d),/);
  });

  it('should serve the electricity indicator metadata with the dataset identity', () => {
    const { status, contentType, body } = respond('/v1/indicators/1295503.metadata.json');

    expect(status).toBe(200);
    expect(contentType).toBe('application/json');
    const metadata = JSON.parse(body) as Record<string, string>;
    expect(metadata.datasetName).toBe('Electricity mix');
    expect(metadata.datasetVersion).toBe('2026-06-30');
    expect(metadata.updatedAt).toBeTruthy();
  });

  it('should serve the ocean health OWID charts in the real format', () => {
    const anomaly = respond('/grapher/sea-surface-temperature-anomaly.csv?tab=chart');
    const heat = respond('/grapher/ocean-heat-content-upper.csv');
    const deep = respond('/grapher/ocean-heat-top-2000m.csv');
    const ph = respond('/grapher/seawater-ph.csv');

    expect(anomaly.body.split('\n')[0]).toBe(
      'entity,code,year,sea_temperature_anomaly_annual,sea_temperature_anomaly_low_annual,sea_temperature_anomaly_high_annual',
    );
    for (const code of ['OWID_WRL', 'OWID_NH', 'OWID_SH']) {
      expect(anomaly.body).toContain(`,${code},2025,`);
    }
    expect(anomaly.body).not.toContain(',2026,');
    expect(heat.body.split('\n')[0]).toContain('ocean_heat_content_csiro_700m');
    expect(deep.body.split('\n')[0]).toContain('ocean_heat_content_noaa_2000m');
    expect(ph.body.split('\n')[0]).toBe('entity,day,ocean_ph_yearly_average,ocean_ph');
  });

  it('should serve the ocean health indicator metadata with the dataset identity', () => {
    for (const id of [1357160, 1357159, 1357158, 1357137]) {
      const { status, body } = respond(`/v1/indicators/${id}.metadata.json`);

      expect(status).toBe(200);
      const metadata = JSON.parse(body) as Record<string, unknown>;
      expect(metadata.datasetName).toBeTruthy();
      expect(metadata.updatedAt).toBeTruthy();
    }
  });

  it('should serve the Copernicus file with its comment header, three full years and a partial one', () => {
    const { status, contentType, body } = respond(
      '/copernicus/era5_daily_series_sst_60S-60N_ocean.csv',
    );

    expect(status).toBe(200);
    expect(contentType).toContain('text/csv');
    expect(body).toContain('# Units: deg. C');
    expect(body).toContain('date,sst,clim_91-20,ano_91-20,status\n2022-01-01,');
    expect(body).toContain('\n2024-02-29,');
    expect(body).toContain('\n2025-06-30,');
    expect(body).not.toContain('\n2025-07-01,');
  });

  it('should serve the NOAA file with the trend line and three missions with values', () => {
    const { status, body } = respond('/noaa-lsa/slr_sla_gbl_free_ref_90.csv');

    expect(status).toBe(200);
    expect(body).toContain('#trend = 3.11 mm/year');
    const rows = body.split('\n').filter((line) => /^\d{4}\./.test(line));
    expect(rows.length).toBeGreaterThan(200);
    const filled = [1, 2, 3, 4, 5].filter((column) =>
      rows.some((row) => row.split(',')[column].trim() !== ''),
    );
    expect(filled).toEqual([1, 4, 5]);
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

  it('should answer a HEAD request with the status and no body', async () => {
    server = await startOwidFixtureServer(0, FIXTURES_DIR);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(
      `http://localhost:${port}/copernicus/era5_daily_series_sst_60S-60N_ocean.csv`,
      { method: 'HEAD' },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });

  it('should reject when the port is already taken', async () => {
    server = await startOwidFixtureServer(0, FIXTURES_DIR);
    const { port } = server.address() as AddressInfo;

    await expect(startOwidFixtureServer(port, FIXTURES_DIR)).rejects.toThrow(/EADDRINUSE/);
  });
});

#!/usr/bin/env node
/**
 * Generates the world map geometry served to the web app as a static asset.
 * Run from the repo root: node scripts/generate-world-geometry.mjs
 *
 * - Countries come from Natural Earth through `world-atlas`: the 110m set (clean, hand-generalized
 *   coasts) plus the 50m features of the territories 110m lacks (Singapore, Bahrain, Malta, the
 *   Lesser Antilles...). Antarctica is dropped: no category has data for it.
 * - Geometry is projected once, here, with Equal Earth. `geoProject` streams it through the
 *   projection, which cuts the antimeridian, so Russia and Fiji do not smear across the map.
 *   The browser loads no geometry library.
 * - ECharts reads registered coordinates as lon/lat (y up), so the screen y is negated.
 * - Each feature carries `{ key, code, name }`: `code` is the OWID entity code (ISO 3166-1 alpha-3
 *   from the numeric id, `OWID_KOS` for Kosovo) or `null` for regions without one; `key` is always
 *   set and unique (the code, or the region's name), because ECharts matches data to regions by it.
 * - `aspect` (width / height of the projected world) sizes the map box in the web app.
 * - The same projection draws the loading silhouette of the map (`world-silhouette.svg`, a CSS mask): the land
 *   outline from `land-110m`, simplified to a few kilobytes, in the frame of the map itself, so
 *   the skeleton has the shape and position of the map that replaces it.
 */
import { writeFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { geoEqualEarth } from 'd3-geo';
import { geoProject } from 'd3-geo-projection';
import countries from 'i18n-iso-countries';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(repoRoot, 'apps/web/public/geo/world-countries.json');
const silhouetteFile = resolve(repoRoot, 'apps/web/public/geo/world-silhouette.svg');

const KOSOVO_NAME = 'Kosovo';
const KOSOVO_ENTITY_CODE = 'OWID_KOS';
const DROPPED = new Set(['Antarctica']);
/** Width of the projection frame; ECharts rescales it to the container. */
const FRAME_WIDTH = 1000;

const loadCountries = (resolution) => {
  const topology = require(`world-atlas/countries-${resolution}.json`);
  return feature(topology, topology.objects.countries).features;
};

const keyOf = (country) => country.id ?? country.properties.name;

const coarse = loadCountries('110m');
const known = new Set(coarse.map(keyOf));
const fine = loadCountries('50m').filter((country) => !known.has(keyOf(country)));

const selected = [...coarse, ...fine].filter(
  (country) => country.geometry && !DROPPED.has(country.properties.name),
);

function entityCode(country) {
  if (country.properties.name === KOSOVO_NAME) {
    return KOSOVO_ENTITY_CODE;
  }
  return country.id === undefined ? null : (countries.numericToAlpha3(country.id) ?? null);
}

const projection = geoEqualEarth().fitWidth(FRAME_WIDTH, { type: 'Sphere' });
const projected = geoProject({ type: 'FeatureCollection', features: selected }, projection);

const round = (value) => Math.round(value * 10) / 10;
const flip = (coordinates) =>
  typeof coordinates[0] === 'number'
    ? [round(coordinates[0]), round(-coordinates[1])]
    : coordinates.map(flip);

let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
const extend = (coordinates) => {
  if (typeof coordinates[0] === 'number') {
    const [x, y] = coordinates;
    [minX, maxX, minY, maxY] = [
      Math.min(minX, x),
      Math.max(maxX, x),
      Math.min(minY, y),
      Math.max(maxY, y),
    ];
  } else {
    coordinates.forEach(extend);
  }
};

const features = projected.features.map((country, index) => {
  const coordinates = flip(country.geometry.coordinates);
  extend(coordinates);
  const code = entityCode(selected[index]);
  const { name } = selected[index].properties;
  return {
    type: 'Feature',
    properties: { key: code ?? `region:${name}`, code, name },
    geometry: { type: country.geometry.type, coordinates },
  };
});

const aspect = Math.round(((maxX - minX) / (maxY - minY)) * 1000) / 1000;
writeFileSync(outFile, `${JSON.stringify({ type: 'FeatureCollection', aspect, features })}\n`);

// Loading silhouette: land without Antarctica, rings smaller than a few px² dropped, points closer
// than SILHOUETTE_STEP px merged (relative to a 1000 px wide frame), integer coordinates in the map's own frame (screen y down).
const SILHOUETTE_STEP = 3.5;
const SILHOUETTE_MIN_AREA = 12;
const landTopology = require('world-atlas/land-110m.json');
const land = feature(landTopology, landTopology.objects.land);
const isAntarctic = (ring) => ring.every(([, latitude]) => latitude < -55);
const landPolygons = land.features
  .flatMap(({ geometry }) =>
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates,
  )
  .filter(([outer]) => !isAntarctic(outer));
const projectedLand = geoProject({ type: 'MultiPolygon', coordinates: landPolygons }, projection);

const ringArea = (ring) =>
  Math.abs(
    ring.reduce((sum, [x, y], i) => {
      const [nx, ny] = ring[(i + 1) % ring.length];
      return sum + x * ny - nx * y;
    }, 0),
  ) / 2;

const silhouetteRings = projectedLand.coordinates
  .flat()
  .filter((ring) => ringArea(ring) >= SILHOUETTE_MIN_AREA)
  .map((ring) => {
    const kept = [];
    for (const [x, y] of ring) {
      const point = [Math.round(x - minX), Math.round(y + maxY)];
      const last = kept[kept.length - 1];
      if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) >= SILHOUETTE_STEP) {
        kept.push(point);
      }
    }
    return kept;
  })
  .filter((ring) => ring.length >= 3);

// Relative commands (`m`, `l`) keep the numbers short.
const silhouettePath = silhouetteRings
  .map((ring) => {
    const [[startX, startY]] = ring;
    const steps = ring.slice(1).map(([x, y], i) => `${x - ring[i][0]} ${y - ring[i][1]}`);
    return `M${startX} ${startY}l${steps.join(' ')}z`;
  })
  .join('');
const viewBox = `0 0 ${Math.round(maxX - minX)} ${Math.round(maxY - minY)}`;
// A static file used as a CSS mask: no JavaScript, fetched only where a map skeleton shows.
writeFileSync(
  silhouetteFile,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${silhouettePath}"/></svg>\n`,
);

const withoutCode = features
  .filter(({ properties }) => !properties.code)
  .map(({ properties }) => properties.name);
console.log(`${features.length} regions (${fine.length} from 50m), aspect ${aspect}`);
console.log(`Regions without an entity code: ${withoutCode.join(', ')}`);
console.log(`Wrote ${outFile}`);
console.log(`Wrote ${silhouetteFile} (${silhouettePath.length} characters)`);

/** Static asset written by `scripts/generate-world-geometry.mjs`. */
export const WORLD_GEOMETRY_URL = '/geo/world-countries.json';

/** Name the world geometry is registered under in ECharts. */
export const WORLD_MAP_NAME = 'world';

/**
 * Feature property map series match their data by: unique per region (the OWID entity code, or
 * `region:<name>` for a region without one). Matching by `code` would collapse every code-less
 * region onto one key and leave them with ECharts' default fill.
 */
export const WORLD_MAP_NAME_PROPERTY = 'key';

/** Zoom bounds of a world map (series `scaleLimit`), shared by the option and the controls. */
export const WORLD_MAP_SCALE_LIMIT = { min: 1, max: 12 } as const;

/** One region of the world map, in geometry order. */
export interface WorldRegion {
  /** Unique key the map series matches data items by (`WORLD_MAP_NAME_PROPERTY`). */
  key: string;
  /** OWID entity code (ISO alpha-3, `OWID_KOS`), or `null` for a region without one. */
  code: string | null;
  /** Natural Earth name, shown only for regions that match no entity. */
  name: string;
}

interface WorldGeometry {
  type: 'FeatureCollection';
  aspect: number;
  features: { properties: { key: string; code: string | null; name: string } }[];
}

function isWorldGeometry(value: unknown): value is WorldGeometry {
  const geometry = value as Partial<WorldGeometry> | null;
  return (
    typeof geometry === 'object' &&
    geometry !== null &&
    geometry.type === 'FeatureCollection' &&
    Array.isArray(geometry.features)
  );
}

let pending: Promise<WorldRegion[]> | undefined;

/**
 * Fetches the world geometry once per page load and registers it in ECharts once. Every caller
 * shares the same promise; a failure is forgotten so the next caller retries.
 */
export function loadWorldGeometry(): Promise<WorldRegion[]> {
  // Started inside `then` so a missing or throwing `fetch` rejects instead of throwing.
  pending ??= Promise.resolve()
    .then(() => fetch(WORLD_GEOMETRY_URL))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`World geometry request failed with status ${response.status}`);
      }
      return response.json() as Promise<unknown>;
    })
    .then(async (geometry) => {
      if (!isWorldGeometry(geometry)) {
        throw new Error('World geometry has an unexpected shape');
      }
      // The lazy map entry, not `echartsSetup`: it registers the map chart, without which
      // `registerMap` fails (the line chart may have loaded `echartsSetup` first).
      const { echarts } = await import('@/components/charts/EMapChart');
      echarts.registerMap(
        WORLD_MAP_NAME,
        geometry as unknown as Parameters<typeof echarts.registerMap>[1],
      );
      return geometry.features.map(({ properties }) => ({
        key: properties.key,
        code: properties.code,
        name: properties.name,
      }));
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
}

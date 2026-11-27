import { cacheLife } from 'next/cache';
import type { ComponentType } from 'react';

import { Co2EmissionsContent } from '@/components/co2-emissions/Co2EmissionsContent';
import {
  DeforestationContent,
  type DeforestationPayloads,
} from '@/components/deforestation/DeforestationContent';
import { EnergySourcesContent } from '@/components/energy-sources/EnergySourcesContent';
import { GlobalTemperatureContent } from '@/components/global-temperature/GlobalTemperatureContent';
import {
  OceanHealthContent,
  type OceanHealthPayloads,
} from '@/components/ocean-health/OceanHealthContent';
import {
  ProviderBackedContent,
  type ProviderPageState,
  type ProviderPayload,
} from '@/components/ProviderBackedContent';
import { WasteRecyclingContent } from '@/components/waste-recycling/WasteRecyclingContent';
import { WaterFootprintContent } from '@/components/water-footprint/WaterFootprintContent';
import { DEGRADED_REVALIDATE_SECONDS, type ProviderPayloadResult } from '@/lib/bffFetch';
import { getCo2Emissions } from '@/lib/co2Emissions';
import { getForestArea, getTreeCoverLoss } from '@/lib/deforestation';
import { getEnergySources } from '@/lib/energySources';
import { getGlobalTemperature } from '@/lib/globalTemperature';
import {
  getOceanHeatContent,
  getOceanPh,
  getOceanSeaLevel,
  getOceanSst,
  getOceanSstAnomaly,
} from '@/lib/oceanHealth';
import { evaluateFreshness, type FreshnessThresholds } from '@/lib/providerFreshness';
import { getWasteRecycling } from '@/lib/wasteRecycling';
import { getWaterFootprintProducts } from '@/lib/waterFootprint';
import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { EcoCategory } from '@eco-metrics/shared';

/** How a category with live data loads and renders its page content. */
export interface CategoryPageDefinition<T = unknown> {
  /** Server-side data fetch. Errors propagate: nothing is rendered or cached from a failure. */
  load: () => Promise<T>;
  /** Server component rendering the fetched data below the common header. */
  Content: ComponentType<{ data: T }>;
  /** True for a result that must leave the cache in minutes (the provider is down). */
  isDegraded?: (data: T) => boolean;
}

/**
 * Keeps each entry type-safe (`load` and `Content` must agree on `T`) while the
 * registry stores them uniformly. The single cast is sound because the page only
 * ever passes a definition's own `load()` result to its own `Content`.
 */
export function defineCategoryPage<T>(
  definition: CategoryPageDefinition<T>,
): CategoryPageDefinition {
  return definition as unknown as CategoryPageDefinition;
}

/** The provider a category's data comes from, and how old its stored data may get. */
export interface ProviderCategoryOptions<P extends ProviderPayload> {
  provider: {
    /**
     * Shown when the provider is down and the BFF sent no `meta` to read the name from
     * (a `502`). Whenever `meta.source.provider` exists it is used instead.
     */
    name: string;
    /** Overrides `DEFAULT_FRESHNESS_THRESHOLDS` for this category. */
    freshness?: FreshnessThresholds;
  };
  /** Server-side read through `fetchProviderPayloadFromBff`. Other failures propagate. */
  load: () => Promise<ProviderPayloadResult<P>>;
  /** The category's own content, rendered for fresh and stale data. */
  Content: ComponentType<{ data: P }>;
}

/**
 * Turns one provider read into what its page (or section) shows. Freshness is evaluated here,
 * once and on the server, so rendering stays pure: a payload is `fresh`, shown under a notice, or
 * too old to show; a provider `502` with no snapshot is `unavailable` without a payload.
 */
export function resolveProviderPageState<P extends ProviderPayload>(
  result: ProviderPayloadResult<P>,
  provider: ProviderCategoryOptions<P>['provider'],
): ProviderPageState<P> {
  if (result.kind === 'provider-unavailable') {
    return { kind: 'unavailable', providerName: provider.name };
  }

  const { payload } = result;
  const providerName = payload.meta.source.provider;
  const freshness = evaluateFreshness(payload.meta, new Date(), provider.freshness);
  switch (freshness.kind) {
    case 'fresh':
      return { kind: 'fresh', payload };
    case 'stale-notice':
      return { kind: 'stale-notice', payload, providerName, fetchedAt: freshness.fetchedAt };
    case 'unavailable':
      return { kind: 'unavailable', providerName, payload, fetchedAt: freshness.fetchedAt };
  }
}

/** True for a state that carries no payload: the page must leave the 24 h cache within minutes. */
function isWithoutPayload<P extends ProviderPayload>(state: ProviderPageState<P>): boolean {
  return state.kind === 'unavailable' && !state.payload;
}

/**
 * Registers a category whose data comes from an external provider. Freshness is
 * evaluated once in `load` (so rendering stays pure) and `Content` is the generic
 * `ProviderBackedContent`: the category content, the same under a stale notice, or an
 * unavailable state. Failures of our own BFF still throw, exactly as in
 * `defineCategoryPage`.
 */
export function defineProviderCategoryPage<P extends ProviderPayload>({
  provider,
  load,
  Content,
}: ProviderCategoryOptions<P>): CategoryPageDefinition {
  return defineCategoryPage<ProviderPageState<P>>({
    load: async () => resolveProviderPageState(await load(), provider),
    Content: ({ data }) => <ProviderBackedContent state={data} Content={Content} />,
    isDegraded: isWithoutPayload,
  });
}

/** One provider-backed section of a page: its provider and its own read. */
export interface ProviderSectionOptions<P extends ProviderPayload> {
  provider: ProviderCategoryOptions<P>['provider'];
  /** Server-side read through `fetchProviderPayloadFromBff`. Other failures propagate. */
  load: () => Promise<ProviderPayloadResult<P>>;
}

/** The payload type of each section, by section key. */
type SectionPayloads = Record<string, ProviderPayload>;

/** What a sectioned page's `Content` receives: the resolved state of every section. */
export type SectionStates<S extends SectionPayloads> = { [K in keyof S]: ProviderPageState<S[K]> };

export interface SectionedProviderCategoryOptions<S extends SectionPayloads> {
  sections: { [K in keyof S]: ProviderSectionOptions<S[K]> };
  /** The page content; it renders each section through `ProviderBackedContent`. */
  Content: ComponentType<{ states: SectionStates<S> }>;
}

/**
 * Registers a category whose page reads several providers, one section each, so an outage
 * affects only its own section. Every section is read concurrently and resolved like
 * `defineProviderCategoryPage` does; a failure of our own BFF in any section still throws for the
 * whole page. The page leaves the 24 h cache when any section is unavailable without a payload.
 */
export function defineSectionedProviderCategoryPage<S extends SectionPayloads>({
  sections,
  Content,
}: SectionedProviderCategoryOptions<S>): CategoryPageDefinition {
  const keys = Object.keys(sections) as (keyof S & string)[];

  return defineCategoryPage<SectionStates<S>>({
    load: async () => {
      const entries = await Promise.all(
        keys.map(async (key) => {
          const { provider, load } = sections[key];
          return [key, resolveProviderPageState(await load(), provider)] as const;
        }),
      );
      return Object.fromEntries(entries) as SectionStates<S>;
    },
    Content: ({ data }) => <Content states={data} />,
    isDegraded: (states) =>
      Object.values<ProviderPageState<ProviderPayload>>(states).some(isWithoutPayload),
  });
}

/** Mirrors `OWID_PUBLISHER.provider` in the API; only used when a `502` carries no `meta`. */
const OWID_PROVIDER_NAME = 'Our World in Data';
/** Mirrors `COPERNICUS_CLIMATE_PULSE_PUBLISHER.provider` in the API. */
const COPERNICUS_CLIMATE_PULSE_PROVIDER_NAME = 'Copernicus Climate Pulse';
/** Mirrors `NOAA_LSA_PUBLISHER.provider` in the API. */
const NOAA_LSA_PROVIDER_NAME = 'NOAA Laboratory for Satellite Altimetry';

/**
 * Categories with live data. A category absent here renders the "coming soon"
 * placeholder and is pre-rendered at build time; adding an entry is all it takes
 * to move it to on-demand ISR.
 */
export const CATEGORY_PAGES: Partial<Record<EcoCategory, CategoryPageDefinition>> = {
  [ECO_CATEGORIES.WASTE_RECYCLING]: defineCategoryPage({
    load: getWasteRecycling,
    Content: ({ data }) => (
      <div className="mt-8 w-full flex justify-center">
        <WasteRecyclingContent data={data} />
      </div>
    ),
  }),
  [ECO_CATEGORIES.WATER_FOOTPRINT]: defineCategoryPage({
    load: getWaterFootprintProducts,
    Content: ({ data }) => (
      <div className="mt-8 w-full flex justify-center">
        <WaterFootprintContent products={data} />
      </div>
    ),
  }),
  [ECO_CATEGORIES.CO2_EMISSIONS]: defineProviderCategoryPage({
    provider: { name: OWID_PROVIDER_NAME },
    load: getCo2Emissions,
    Content: ({ data }) => (
      <div className="mt-8 w-full flex justify-center">
        <Co2EmissionsContent data={data} />
      </div>
    ),
  }),
  [ECO_CATEGORIES.GLOBAL_TEMPERATURE]: defineProviderCategoryPage({
    provider: { name: OWID_PROVIDER_NAME },
    load: getGlobalTemperature,
    Content: ({ data }) => (
      <div className="mt-8 w-full flex justify-center">
        <GlobalTemperatureContent data={data} />
      </div>
    ),
  }),
  [ECO_CATEGORIES.OCEAN_HEALTH]: defineSectionedProviderCategoryPage<OceanHealthPayloads>({
    sections: {
      // Copernicus is about two days behind real time and the section is about the latest day.
      sst: {
        provider: {
          name: COPERNICUS_CLIMATE_PULSE_PROVIDER_NAME,
          freshness: { silentDays: 2, noticeDays: 30 },
        },
        load: getOceanSst,
      },
      anomaly: { provider: { name: OWID_PROVIDER_NAME }, load: getOceanSstAnomaly },
      heat: { provider: { name: OWID_PROVIDER_NAME }, load: getOceanHeatContent },
      seaLevel: { provider: { name: NOAA_LSA_PROVIDER_NAME }, load: getOceanSeaLevel },
      ph: { provider: { name: OWID_PROVIDER_NAME }, load: getOceanPh },
    },
    Content: ({ states }) => (
      <div className="mt-8 w-full flex justify-center">
        <OceanHealthContent states={states} />
      </div>
    ),
  }),
  // Both sections read Our World in Data; each has its own endpoint, snapshot and state.
  [ECO_CATEGORIES.DEFORESTATION]: defineSectionedProviderCategoryPage<DeforestationPayloads>({
    sections: {
      forestArea: { provider: { name: OWID_PROVIDER_NAME }, load: getForestArea },
      treeCoverLoss: { provider: { name: OWID_PROVIDER_NAME }, load: getTreeCoverLoss },
    },
    Content: ({ states }) => (
      <div className="mt-8 w-full flex justify-center">
        <DeforestationContent states={states} />
      </div>
    ),
  }),
  [ECO_CATEGORIES.ENERGY_SOURCES]: defineProviderCategoryPage({
    provider: { name: OWID_PROVIDER_NAME },
    load: getEnergySources,
    Content: ({ data }) => (
      <div className="mt-8 w-full flex justify-center">
        <EnergySourcesContent data={data} />
      </div>
    ),
  }),
};

const DAY_SECONDS = 86_400;

/**
 * The cached read of a category: complete pages reach the HTML with their data, a failure
 * throws and is never stored, and a degraded result is regenerated within minutes.
 */
export async function loadCategoryData(category: EcoCategory): Promise<unknown> {
  'use cache';
  const definition = CATEGORY_PAGES[category];
  if (!definition) {
    return undefined;
  }
  const data = await definition.load();
  const revalidate = definition.isDegraded?.(data) ? DEGRADED_REVALIDATE_SECONDS : DAY_SECONDS;
  cacheLife({ stale: revalidate, revalidate, expire: DAY_SECONDS * 30 });
  return data;
}

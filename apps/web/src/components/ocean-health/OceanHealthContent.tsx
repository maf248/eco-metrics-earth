import { JsonLd } from '@/components/JsonLd';
import { OceanHeatContentSection } from '@/components/ocean-health/OceanHeatContentSection';
import { OceanKeyFigures } from '@/components/ocean-health/OceanKeyFigures';
import { OceanPhSection } from '@/components/ocean-health/OceanPhSection';
import { OceanSeaLevelSection } from '@/components/ocean-health/OceanSeaLevelSection';
import { OceanSection } from '@/components/ocean-health/OceanSection';
import { OceanSstAnomalySection } from '@/components/ocean-health/OceanSstAnomalySection';
import { OceanSstDailySection } from '@/components/ocean-health/OceanSstDailySection';
import {
  ProviderBackedContent,
  type SectionState,
  type ProviderPayload,
} from '@/components/ProviderBackedContent';
import { CATEGORY_CONTENT_CLASS_NAME } from '@/lib/cardClassNames';
import type { SectionStates } from '@/lib/categoryPages';
import type { OceanPayload } from '@/lib/oceanHealth';
import {
  buildOceanHealthDatasetJsonLd,
  type OceanHealthSections,
} from '@/lib/oceanHealthStructuredData';
import { siteUrl } from '@/lib/siteUrl';
import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type {
  OceanHeatContentData,
  OceanPhData,
  OceanSeaLevelData,
  OceanSstAnomalyData,
  OceanSstDailyData,
} from '@eco-metrics/shared';

/** The five sections of the page and the payload each provider read gives. */
export type OceanHealthPayloads = {
  sst: OceanPayload<OceanSstDailyData>;
  anomaly: OceanPayload<OceanSstAnomalyData>;
  heat: OceanPayload<OceanHeatContentData>;
  seaLevel: OceanPayload<OceanSeaLevelData>;
  ph: OceanPayload<OceanPhData>;
};

interface OceanHealthContentProps {
  states: SectionStates<OceanHealthPayloads>;
}

/** The payload of a section whose data is shown (fresh, or under a stale notice). */
function shownPayload<P extends ProviderPayload>(state: SectionState<P>): P | undefined {
  return state.kind === 'fresh' || state.kind === 'stale-notice' ? state.payload : undefined;
}

/**
 * The ocean health page: a one-sentence intro, the key figures (one per section that has data),
 * the daily chart under its own provider state, and four more sections, each a card with its own
 * heading and its own provider state. A provider outage therefore only ever takes its own section
 * and its own figure down. One `Dataset` JSON-LD describes the sections that are shown.
 */
export function OceanHealthContent({ states }: OceanHealthContentProps) {
  const sections: OceanHealthSections = {
    sst: shownPayload(states.sst),
    anomaly: shownPayload(states.anomaly),
    heat: shownPayload(states.heat),
    seaLevel: shownPayload(states.seaLevel),
    ph: shownPayload(states.ph),
  };
  const jsonLd = buildOceanHealthDatasetJsonLd({
    sections,
    pageUrl: `${siteUrl()}/${ECO_CATEGORIES.OCEAN_HEALTH}/`,
    dataSourcesUrl: `${siteUrl()}/data-sources/`,
  });

  return (
    <div className={CATEGORY_CONTENT_CLASS_NAME}>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <p className="mb-6 text-center text-fg-secondary">
        Daily sea surface temperature, plus the ocean&rsquo;s annual warming, stored heat, sea level
        and pH.
      </p>

      <OceanKeyFigures sections={sections} />

      <ProviderBackedContent state={states.sst} Content={OceanSstDailySection} />

      <OceanSection
        headingId="ocean-sst-anomaly-heading"
        title="Annual sea surface temperature anomaly"
        state={states.anomaly}
        Body={OceanSstAnomalySection}
      />
      <OceanSection
        headingId="ocean-heat-heading"
        title="Ocean heat content"
        state={states.heat}
        Body={OceanHeatContentSection}
      />
      <OceanSection
        headingId="ocean-sea-level-heading"
        title="Global mean sea level"
        state={states.seaLevel}
        Body={OceanSeaLevelSection}
      />
      <OceanSection
        headingId="ocean-ph-heading"
        title="Ocean pH at Hawaii"
        state={states.ph}
        Body={OceanPhSection}
      />
    </div>
  );
}

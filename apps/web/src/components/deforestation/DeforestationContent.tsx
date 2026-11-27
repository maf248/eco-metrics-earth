import type { ComponentType } from 'react';

import { DataAttribution } from '@/components/DataAttribution';
import { DeforestationMethodology } from '@/components/deforestation/DeforestationMethodology';
import { ForestAreaSection } from '@/components/deforestation/ForestAreaSection';
import { ForestChangeSection } from '@/components/deforestation/ForestChangeSection';
import { ForestKeyFigures } from '@/components/deforestation/ForestKeyFigures';
import { TreeCoverLossSection } from '@/components/deforestation/TreeCoverLossSection';
import { JsonLd } from '@/components/JsonLd';
import { OriginCredit } from '@/components/OriginCredit';
import {
  ProviderBackedContent,
  type SectionState,
  type ProviderPayload,
} from '@/components/ProviderBackedContent';
import {
  CATEGORY_CONTENT_CLASS_NAME,
  CARD_CLASS_NAME,
  KEY_FIGURES_CLASS_NAME,
} from '@/lib/cardClassNames';
import type { SectionStates } from '@/lib/categoryPages';
import type { DeforestationPayload } from '@/lib/deforestation';
import { buildDeforestationDatasetJsonLd } from '@/lib/deforestationStructuredData';
import { siteUrl } from '@/lib/siteUrl';
import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { ForestAreaData, TreeCoverLossData } from '@eco-metrics/shared';

/** The two sections of the page and the payload each provider read gives. */
export type DeforestationPayloads = {
  forestArea: DeforestationPayload<ForestAreaData>;
  treeCoverLoss: DeforestationPayload<TreeCoverLossData>;
};

interface DeforestationContentProps {
  states: SectionStates<DeforestationPayloads>;
}

/** The payload of a section whose data is shown (fresh, or under a stale notice). */
function shownPayload<P extends ProviderPayload>(state: SectionState<P>): P | undefined {
  return state.kind === 'fresh' || state.kind === 'stale-notice' ? state.payload : undefined;
}

type ForestAreaPayload = DeforestationPayloads['forestArea'];
type TreeCoverLossPayload = DeforestationPayloads['treeCoverLoss'];

/** The explorer and the change card, both fed by the forest area payload. */
function ForestAreaCards({ data: { data, meta } }: { data: ForestAreaPayload }) {
  const attribution = (
    <DataAttribution
      testId="forest-area-attribution"
      meta={meta}
      extra={<OriginCredit origin={data.origin} testId="forest-area-origin" />}
    />
  );

  return (
    <>
      {/* The margin collapses with the key figures' own, and sets the card apart from a notice. */}
      <div className="mt-4">
        <ForestAreaSection data={data} attribution={attribution} />
      </div>
      <ForestChangeSection data={data} />
    </>
  );
}

function TreeCoverLossCard({ data: { data, meta } }: { data: TreeCoverLossPayload }) {
  const attribution = (
    <DataAttribution
      testId="tree-cover-loss-attribution"
      meta={meta}
      extra={<OriginCredit origin={data.origin} testId="tree-cover-loss-origin" />}
    />
  );

  return (
    <div className="mt-4">
      <TreeCoverLossSection data={data} attribution={attribution} />
    </div>
  );
}

interface SectionProps<P extends ProviderPayload> {
  headingId: string;
  title: string;
  state: SectionState<P>;
  Cards: ComponentType<{ data: P }>;
  /** Classes of a wrapper, for spacing that must disappear with a failed section. */
  className?: string;
}

/**
 * One provider-backed section: its cards (under a stale notice when the data has aged), or, when
 * its provider gave nothing usable, a card with the section's heading and the unavailable state
 * in place of the cards. Each section reads its own state, so one outage never touches the other.
 */
function DeforestationSection<P extends ProviderPayload>({
  headingId,
  title,
  state,
  Cards,
  className,
}: SectionProps<P>) {
  // A section whose read failed is left out entirely, heading included.
  if (state.kind === 'failed') {
    return null;
  }
  const content = shownPayload(state) ? (
    <ProviderBackedContent state={state} Content={Cards} />
  ) : (
    <section aria-labelledby={headingId} className={`mt-8 ${CARD_CLASS_NAME}`}>
      <h2 id={headingId} className="mb-4 text-xl font-semibold text-fg">
        {title}
      </h2>
      <ProviderBackedContent state={state} Content={Cards} />
    </section>
  );
  return className ? <div className={className}>{content}</div> : content;
}

/**
 * The deforestation page: an intro line, the key figures and the forest area explorer, map and
 * ranking (one provider state), tree cover loss by cause (its own provider state) and the static
 * methodology note. One `Dataset` JSON-LD describes the sections that are shown.
 */
export function DeforestationContent({ states }: DeforestationContentProps) {
  const forestArea = shownPayload(states.forestArea);
  const treeCoverLoss = shownPayload(states.treeCoverLoss);
  const jsonLd = buildDeforestationDatasetJsonLd({
    sections: { forestArea, treeCoverLoss },
    pageUrl: `${siteUrl()}/${ECO_CATEGORIES.DEFORESTATION}/`,
    dataSourcesUrl: `${siteUrl()}/data-sources/`,
  });

  return (
    <div className={CATEGORY_CONTENT_CLASS_NAME}>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <p className="mb-6 text-center text-fg-secondary">
        How much forest is the world losing, where, and why?
      </p>

      {forestArea ? (
        <div className={KEY_FIGURES_CLASS_NAME}>
          <ForestKeyFigures data={forestArea.data} />
        </div>
      ) : null}

      <DeforestationSection
        headingId="forest-area-heading"
        title="Forest area"
        state={states.forestArea}
        Cards={ForestAreaCards}
      />
      <DeforestationSection
        headingId="tree-cover-loss-heading"
        title="Tree cover loss by cause"
        state={states.treeCoverLoss}
        Cards={TreeCoverLossCard}
        className="mt-8"
      />

      <DeforestationMethodology />
    </div>
  );
}

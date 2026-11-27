import type { ComponentType } from 'react';

import {
  ProviderBackedContent,
  type ProviderPayload,
  type SectionState,
} from '@/components/ProviderBackedContent';
import { CARD_CLASS_NAME } from '@/lib/cardClassNames';

interface OceanSectionProps<P extends ProviderPayload> {
  /** Id of the heading, which names the section for assistive technology. */
  headingId: string;
  title: string;
  /** What this section shows right now: data, data under a notice, an outage, or nothing. */
  state: SectionState<P>;
  /** The section body, rendered for fresh and stale data. */
  Body: ComponentType<{ data: P }>;
}

/**
 * One provider-backed section of the ocean health page: a card with its own `<h2>`, and the
 * body, the body under a stale notice, or the unavailable state in its place, under that same
 * heading. Each section reads its own state, so one provider's outage never touches another.
 */
export function OceanSection<P extends ProviderPayload>({
  headingId,
  title,
  state,
  Body,
}: OceanSectionProps<P>) {
  // A section whose read failed is left out entirely, heading included.
  if (state.kind === 'failed') {
    return null;
  }
  return (
    <section aria-labelledby={headingId} className={`mt-8 ${CARD_CLASS_NAME}`}>
      <h2 id={headingId} className="mb-4 text-xl font-semibold text-fg">
        {title}
      </h2>
      <ProviderBackedContent state={state} Content={Body} />
    </section>
  );
}

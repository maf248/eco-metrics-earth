import type { ComponentType } from 'react';

import { DataAttribution } from '@/components/DataAttribution';
import { DataUnavailable } from '@/components/DataUnavailable';
import { StaleDataNotice } from '@/components/StaleDataNotice';
import type { ApiResponseMeta } from '@eco-metrics/shared';

/** A provider-backed payload: the category data and its response meta. */
export interface ProviderPayload {
  meta: ApiResponseMeta;
}

/** What a provider-backed page shows, resolved once on the server when it loads. */
export type ProviderPageState<P extends ProviderPayload> =
  | { kind: 'fresh'; payload: P }
  | { kind: 'stale-notice'; payload: P; providerName: string; fetchedAt: string }
  | {
      kind: 'unavailable';
      providerName: string;
      /** Present when a payload exists but is too old to show; absent on a provider `502`. */
      payload?: P;
      fetchedAt?: string;
    };

interface ProviderBackedContentProps<P extends ProviderPayload> {
  state: ProviderPageState<P>;
  /** The category's own content, rendered for fresh and stale data. */
  Content: ComponentType<{ data: P }>;
}

/**
 * Generic wrapper of every provider-backed category: the category content as is when
 * the data is fresh, the same content under a notice when it has aged, and
 * an unavailable state in its place (keeping the source credit when it is known)
 * otherwise. The common page header stays outside, so it is always rendered.
 */
export function ProviderBackedContent<P extends ProviderPayload>({
  state,
  Content,
}: ProviderBackedContentProps<P>) {
  if (state.kind === 'fresh') {
    return <Content data={state.payload} />;
  }

  if (state.kind === 'stale-notice') {
    return (
      <>
        <StaleDataNotice providerName={state.providerName} fetchedAt={state.fetchedAt} />
        <Content data={state.payload} />
      </>
    );
  }

  return (
    <>
      <DataUnavailable providerName={state.providerName} lastRetrievedAt={state.fetchedAt} />
      {state.payload ? (
        <div className="w-full max-w-4xl pb-12">
          <DataAttribution testId="unavailable-data-attribution" meta={state.payload.meta} />
        </div>
      ) : null}
    </>
  );
}

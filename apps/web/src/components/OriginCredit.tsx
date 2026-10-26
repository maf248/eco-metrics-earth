import { LINK_CLASS_NAME } from '@/lib/linkClassName';
import type { DataSourceOrigin } from '@eco-metrics/shared';

interface OriginCreditProps {
  origin: DataSourceOrigin;
  testId?: string;
}

/** Ends a credit text with a period unless it already ends with punctuation. */
function sentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/**
 * The credit an upstream license asks for, as inline text: producer, dataset
 * title and license name (both external links), then the notice and the
 * disclaimer when the origin has them. The citation is not repeated here: it is
 * listed on `/data-sources/`. Every string comes from the origin the
 * API served; nothing is written here.
 */
export function OriginCredit({ origin, testId }: OriginCreditProps) {
  const { producer, title, url, license, notice, disclaimer } = origin;

  return (
    <span data-testid={testId}>
      {producer}:{' '}
      <a href={url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS_NAME}>
        {title}
      </a>{' '}
      (
      <a href={license.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS_NAME}>
        {license.name}
      </a>
      ).
      {notice ? ` ${sentence(notice)}` : null}
      {disclaimer ? ` ${sentence(disclaimer)}` : null}
    </span>
  );
}

import { isEcoCategory } from '@/lib/isEcoCategory';
import type { EcoCategory } from '@eco-metrics/shared';

/** The category an internal href points at, if it is a category page. */
export function categoryFromHref(href: string): EcoCategory | undefined {
  const slug = href.split(/[?#]/)[0].replace(/^\/|\/$/g, '');
  return isEcoCategory(slug) ? slug : undefined;
}

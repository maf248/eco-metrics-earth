import { getCategoryIcon } from '@/lib/categoryIcon';
import { getCategoryTitle } from '@/lib/categoryTitle';
import { isLiveCategory } from '@/lib/liveCategories';
import { PAGE_TITLE_CLASS_NAME } from '@/lib/pageTitleClassName';
import type { EcoCategory } from '@eco-metrics/shared';

/** Classes of the content of a category page, shared with its pending view. */
export const CATEGORY_PAGE_CLASS_NAME = 'flex flex-col items-center justify-start pt-header px-4';

/**
 * Icon and `<h1>` of a category. Everything here comes from config, so the server renders it
 * in the page and the client shows the same markup the moment a navigation starts.
 */
export function CategoryHeader({ category }: { category: EcoCategory }) {
  const title = getCategoryTitle(category);
  const Icon = getCategoryIcon(category);

  return (
    <div className="flex flex-col items-center gap-6 mt-14 lg:mt-0">
      <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-well p-4">
        {/* getCategoryIcon returns a stable ref to an existing component — not created during render. */}
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Icon aria-hidden className="w-16 h-16 drop-shadow-icon-lg" />
      </div>
      <div className="text-center">
        <h1 className={PAGE_TITLE_CLASS_NAME}>{title}</h1>
        {!isLiveCategory(category) && (
          <p className="mt-4 text-fg-secondary">{title} metrics — coming soon.</p>
        )}
      </div>
    </div>
  );
}

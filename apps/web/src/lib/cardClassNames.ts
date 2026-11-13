/**
 * Shared layout classes of a category's data column and its cards.
 *
 * Cards and the key-figures panel sit on `surface-card`, a tone barely off the page in both
 * themes. Below `sm` the page's own 16 px gutter (`CATEGORY_PAGE_CLASS_NAME`) is the only one:
 * cards and the key-figures panel bleed through it to the screen edges as borderless bands,
 * and charts and tables bleed through the card padding, so a plot or a map spans the whole
 * screen width. From `sm` up the column adds its own gutter and cards are rounded, bordered
 * boxes.
 */

/** Data column below the category header. */
export const CATEGORY_CONTENT_CLASS_NAME = 'w-full max-w-4xl pb-12 sm:px-4';

/** A card holding charts, a map or tables (explorers, the CO2 map, the long-run chart). */
export const CARD_CLASS_NAME =
  '-mx-4 bg-surface-card p-4 sm:mx-0 sm:rounded-2xl sm:border sm:border-line-strong sm:p-6';

/** The key-figures panel above the explorer. */
export const KEY_FIGURES_CLASS_NAME =
  '-mx-4 mb-8 bg-surface-card px-5 py-5 text-center sm:mx-0 sm:rounded-2xl sm:px-8';

/** A chart box or a table region inside a card: below `sm` it spans the card edge to edge. */
export const CARD_BLEED_CLASS_NAME = '-mx-4 sm:mx-0';

/**
 * Bordered, keyboard-focusable scroll region of a data table inside a card. Below `sm` it
 * spans the card edge to edge (top and bottom borders only) and its focus indicator is an
 * outline drawn inside the edges, since the screen edges would clip an outer ring; an outline
 * (unlike an inset ring) paints above the sticky header and highlighted rows. Its sticky head
 * is `bg-surface-card`, so it blends into the card.
 */
export const TABLE_REGION_CLASS_NAME = `${CARD_BLEED_CLASS_NAME} border-y border-line-strong focus-visible:outline-none max-sm:focus-visible:outline-solid max-sm:focus-visible:outline-2 max-sm:focus-visible:-outline-offset-2 max-sm:focus-visible:outline-focus-ring sm:rounded-lg sm:border sm:focus-visible:ring-2 sm:focus-visible:ring-focus-ring sm:focus-visible:ring-offset-2 ring-offset-focus-offset`;

/** Focus indicator of a control inside a card: a ring with an offset from the card's surface. */
export const FOCUS_RING_CLASS_NAME =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset';

/** Keeps `row` visible inside `region` by scrolling the region only, never the page. */
export function scrollRowIntoRegion(region: HTMLElement | null, row: HTMLElement | null): void {
  if (!region || !row) {
    return;
  }
  const header = region.querySelector('thead')?.getBoundingClientRect().height ?? 0;
  const top = row.offsetTop - header;
  const bottom = row.offsetTop + row.offsetHeight;
  if (top < region.scrollTop) {
    region.scrollTop = top;
  } else if (bottom > region.scrollTop + region.clientHeight) {
    region.scrollTop = bottom - region.clientHeight;
  }
}

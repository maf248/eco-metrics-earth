import { scrollRowIntoRegion } from '@/lib/scrollRowIntoRegion';

/** jsdom has no layout: the geometry the function reads is defined by hand. */
function region(scrollTop: number, clientHeight: number, headerHeight: number): HTMLElement {
  const element = document.createElement('div');
  const thead = document.createElement('thead');
  thead.getBoundingClientRect = () => ({ height: headerHeight }) as DOMRect;
  element.appendChild(thead);
  element.scrollTop = scrollTop;
  Object.defineProperty(element, 'clientHeight', { value: clientHeight });
  return element;
}

function row(offsetTop: number, offsetHeight: number): HTMLElement {
  const element = document.createElement('tr');
  Object.defineProperty(element, 'offsetTop', { value: offsetTop });
  Object.defineProperty(element, 'offsetHeight', { value: offsetHeight });
  return element;
}

describe('scrollRowIntoRegion', () => {
  it('should do nothing without a region or a row', () => {
    const target = region(50, 200, 40);

    scrollRowIntoRegion(null, row(0, 20));
    scrollRowIntoRegion(target, null);

    expect(target.scrollTop).toBe(50);
  });

  it('should scroll up so a row above the view clears the sticky header', () => {
    const target = region(300, 200, 40);

    scrollRowIntoRegion(target, row(100, 30));

    expect(target.scrollTop).toBe(60);
  });

  it('should scroll down so a row below the view ends at the bottom edge', () => {
    const target = region(0, 200, 40);

    scrollRowIntoRegion(target, row(400, 30));

    expect(target.scrollTop).toBe(230);
  });

  it('should leave the scroll position when the row is already visible', () => {
    const target = region(100, 200, 40);

    scrollRowIntoRegion(target, row(180, 30));

    expect(target.scrollTop).toBe(100);
  });
});

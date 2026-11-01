import { categoryFromHref } from '@/lib/categoryFromHref';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

describe('categoryFromHref', () => {
  it('should read the category of a href with or without slashes, query or hash', () => {
    expect(categoryFromHref('/co2-emissions/')).toBe(ECO_CATEGORIES.CO2_EMISSIONS);
    expect(categoryFromHref('/co2-emissions')).toBe(ECO_CATEGORIES.CO2_EMISSIONS);
    expect(categoryFromHref('/co2-emissions/?a=1#b')).toBe(ECO_CATEGORIES.CO2_EMISSIONS);
  });

  it('should return undefined for any other route', () => {
    expect(categoryFromHref('/')).toBeUndefined();
    expect(categoryFromHref('/data-sources/')).toBeUndefined();
  });
});

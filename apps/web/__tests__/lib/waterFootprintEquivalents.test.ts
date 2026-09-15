import {
  BATHTUB_LITERS,
  formatLiters,
  formatWaterFootprintEquivalents,
  SHOWER_LITERS,
} from '@/lib/waterFootprintEquivalents';

describe('waterFootprintEquivalents constants', () => {
  it('should expose the documented reference values', () => {
    expect(SHOWER_LITERS).toBe(65);
    expect(BATHTUB_LITERS).toBe(150);
  });
});

describe('formatLiters', () => {
  it('should format 180.1 with one decimal', () => {
    expect(formatLiters(180.1)).toBe('180.1');
  });

  it('should format 1451.2 with grouping separator', () => {
    expect(formatLiters(1451.2)).toBe('1,451.2');
  });

  it('should format 400000 with grouping separators and no decimal', () => {
    expect(formatLiters(400000)).toBe('400,000');
  });
});

describe('formatWaterFootprintEquivalents', () => {
  it('should return em-dash for null', () => {
    expect(formatWaterFootprintEquivalents(null)).toBe('—');
  });

  it('should return "under 1 shower" for values below one shower', () => {
    expect(formatWaterFootprintEquivalents(64)).toBe('under 1 shower');
  });

  it('should use singular shower at exactly one shower', () => {
    expect(formatWaterFootprintEquivalents(65)).toBe('≈ 1 shower');
  });

  it('should show showers only between one shower and one bathtub', () => {
    expect(formatWaterFootprintEquivalents(100)).toBe('≈ 1.5 showers');
  });

  it('should include bathtubs at the bathtub boundary', () => {
    expect(formatWaterFootprintEquivalents(150)).toBe('≈ 2.3 showers · ≈ 1 bathtub');
  });

  it('should round large quotients to integers and smaller ones to one decimal', () => {
    expect(formatWaterFootprintEquivalents(12760)).toBe('≈ 196 showers · ≈ 85.1 bathtubs');
  });

  it('should round very large values to integers', () => {
    expect(formatWaterFootprintEquivalents(400000)).toBe('≈ 6,154 showers · ≈ 2,667 bathtubs');
  });
});

import {
  detectSourceChanges,
  highestEditionMentioned,
  isNewerEdition,
  WASTE_SOURCE,
} from '../../../../scripts/lib/waste-recycling-source.mjs';

describe('highestEditionMentioned', () => {
  it('should return null when no edition is mentioned', () => {
    expect(highestEditionMentioned('<p>Waste data</p>')).toBeNull();
    expect(highestEditionMentioned(null)).toBeNull();
  });

  it('should return the only edition mentioned', () => {
    expect(highestEditionMentioned('<h1>What a Waste 3.0</h1>')).toBe('3.0');
  });

  it('should return the highest of several editions', () => {
    expect(
      highestEditionMentioned('What a Waste 2.0 ... What a Waste 4.0 ... What a Waste 3.0'),
    ).toBe('4.0');
  });

  it('should match case-insensitively and across whitespace', () => {
    expect(highestEditionMentioned('WHAT A  WASTE 3.1 and what a waste 2.0')).toBe('3.1');
  });
});

describe('isNewerEdition', () => {
  it('should compare major then minor numerically', () => {
    expect(isNewerEdition('4.0', '3.0')).toBe(true);
    expect(isNewerEdition('3.1', '3.0')).toBe(true);
    expect(isNewerEdition('3.10', '3.9')).toBe(true);
  });

  it('should be false for equal or older editions', () => {
    expect(isNewerEdition('3.0', '3.0')).toBe(false);
    expect(isNewerEdition('2.0', '3.0')).toBe(false);
    expect(isNewerEdition('3.9', '3.10')).toBe(false);
  });

  it('should be false when an edition is malformed', () => {
    expect(isNewerEdition('next', '3.0')).toBe(false);
  });
});

describe('detectSourceChanges', () => {
  const unchanged = {
    portalHtml: 'What a Waste 3.0 and What a Waste 2.0',
    workbook: { status: 200, lastModified: WASTE_SOURCE.workbookLastModified },
  };

  it('should return nothing when the source did not change', () => {
    expect(detectSourceChanges(unchanged)).toEqual([]);
  });

  it('should report a newer edition on the portal', () => {
    const findings = detectSourceChanges({ ...unchanged, portalHtml: 'What a Waste 4.0' });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('4.0');
  });

  it('should report a revised workbook', () => {
    const findings = detectSourceChanges({
      ...unchanged,
      workbook: { status: 200, lastModified: 'Mon, 01 Jun 2026 10:00:00 GMT' },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('Mon, 01 Jun 2026 10:00:00 GMT');
  });

  it('should report a workbook that is no longer available', () => {
    const findings = detectSourceChanges({
      ...unchanged,
      workbook: { status: 404, lastModified: null },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('404');
  });

  it('should report every change found', () => {
    const findings = detectSourceChanges({
      portalHtml: 'What a Waste 3.1',
      workbook: { status: 404, lastModified: null },
    });
    expect(findings).toHaveLength(2);
  });
});

import {
  ISO3_TO_ISO2,
  KOSOVO_ENTITY_CODE,
  WORLD_ENTITY_CODE,
  iso2ForEntityCode,
  listCountryEntityCodes,
} from '../../src';

describe('iso2ForEntityCode', () => {
  it.each([
    ['ARG', 'AR'],
    ['USA', 'US'],
    ['GBR', 'GB'],
  ])('should map %s to %s', (code, iso2) => {
    expect(iso2ForEntityCode(code)).toBe(iso2);
  });

  it('should map Kosovo to XK', () => {
    expect(iso2ForEntityCode(KOSOVO_ENTITY_CODE)).toBe('XK');
  });

  it('should return null for World', () => {
    expect(iso2ForEntityCode(WORLD_ENTITY_CODE)).toBeNull();
  });

  it.each(['OWID_EUR', 'OWID_HIC', 'ZZZ', '', 'toString'])(
    'should return null for the unknown or aggregate code "%s"',
    (code) => {
      expect(iso2ForEntityCode(code)).toBeNull();
    },
  );
});

describe('ISO3_TO_ISO2', () => {
  it('should have well-formed, unique codes', () => {
    const entries = Object.entries(ISO3_TO_ISO2);

    for (const [alpha3, alpha2] of entries) {
      expect(alpha3).toMatch(/^[A-Z]{3}$/);
      expect(alpha2).toMatch(/^[A-Z]{2}$/);
    }
    expect(new Set(entries.map(([, alpha2]) => alpha2)).size).toBe(entries.length);
  });
});

describe('listCountryEntityCodes', () => {
  it('should include countries, Kosovo and World', () => {
    const codes = listCountryEntityCodes();

    expect(codes).toEqual(expect.arrayContaining(['ARG', KOSOVO_ENTITY_CODE, WORLD_ENTITY_CODE]));
  });

  it('should be sorted and free of duplicates', () => {
    const codes = listCountryEntityCodes();

    expect(codes).toEqual([...codes].sort());
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('should not include aggregates', () => {
    const codes = listCountryEntityCodes();

    expect(codes).not.toContain('OWID_EUR');
    expect(codes).not.toContain('OWID_HIC');
    expect(codes).not.toContain('ZZZ');
  });
});

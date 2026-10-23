import {
  buildOpenGraph,
  buildTwitter,
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
} from '@/lib/socialMetadata';

describe('OG_IMAGE', () => {
  it('should describe a 1200x630 PNG with alt text', () => {
    expect(OG_IMAGE.width).toBe(1200);
    expect(OG_IMAGE.height).toBe(630);
    expect(OG_IMAGE.type).toBe('image/png');
    expect(OG_IMAGE.alt.length).toBeGreaterThan(0);
  });

  it('should use a path with a file extension so trailingSlash does not redirect it', () => {
    expect(OG_IMAGE.url).toBe('/og-image.png');
  });
});

describe('SITE_DESCRIPTION', () => {
  it('should be between 110 and 160 characters', () => {
    expect(SITE_DESCRIPTION.length).toBeGreaterThanOrEqual(110);
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });
});

describe('buildOpenGraph', () => {
  it('should return the shared type, site name and social card by default', () => {
    expect(buildOpenGraph()).toEqual({
      type: 'website',
      siteName: SITE_NAME,
      images: [OG_IMAGE],
    });
  });

  it('should merge page-specific fields over the shared ones', () => {
    const result = buildOpenGraph({ title: 'CO2 Emissions', url: 'https://example.com/co2/' });
    expect(result).toMatchObject({
      type: 'website',
      siteName: SITE_NAME,
      images: [OG_IMAGE],
      title: 'CO2 Emissions',
      url: 'https://example.com/co2/',
    });
  });
});

describe('buildTwitter', () => {
  it('should return the summary_large_image card by default', () => {
    expect(buildTwitter()).toEqual({ card: 'summary_large_image' });
  });

  it('should merge page-specific fields and leave images to Next.js', () => {
    const result = buildTwitter({ title: 'CO2 Emissions', description: 'desc' });
    expect(result).toEqual({
      card: 'summary_large_image',
      title: 'CO2 Emissions',
      description: 'desc',
    });
  });
});

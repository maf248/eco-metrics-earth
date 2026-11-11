import { buildSiteJsonLd } from '@/lib/siteStructuredData';
import { SITE_DESCRIPTION } from '@/lib/socialMetadata';

type Node = Record<string, unknown>;

function nodes(): Node[] {
  return buildSiteJsonLd('https://example.org')['@graph'] as Node[];
}

function nodeOfType(type: string): Node {
  const node = nodes().find((candidate) => candidate['@type'] === type);
  if (!node) throw new Error(`missing ${type}`);
  return node;
}

describe('buildSiteJsonLd', () => {
  it('should declare the schema.org context', () => {
    expect(buildSiteJsonLd('https://example.org')['@context']).toBe('https://schema.org');
  });

  it('should describe the website with the canonical home URL', () => {
    expect(nodeOfType('WebSite')).toMatchObject({
      name: 'eco-metrics earth',
      url: 'https://example.org/',
      description: SITE_DESCRIPTION,
      inLanguage: 'en',
    });
  });

  it('should describe the organization with an absolute raster logo', () => {
    expect(nodeOfType('Organization')).toMatchObject({
      name: 'eco-metrics earth',
      url: 'https://example.org/',
      logo: 'https://example.org/icons/apple-touch-icon.png',
    });
  });

  it('should reference the organization as the publisher of the website', () => {
    expect(nodeOfType('WebSite').publisher).toEqual({ '@id': nodeOfType('Organization')['@id'] });
  });
});

import { escapeHtml } from '@/lib/escapeHtml';

describe('escapeHtml', () => {
  it('should escape the five characters that can open markup', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('should leave plain text untouched', () => {
    expect(escapeHtml("Côte d'Ivoire".replace("'", ''))).toBe('Côte dIvoire');
  });
});

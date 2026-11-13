import { escapeHtml } from '@/lib/escapeHtml';

describe('escapeHtml', () => {
  it('should escape the five characters that can open markup', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('should leave plain text untouched', () => {
    // The dataset spells this name with a typographic apostrophe, which is not markup.
    const plain = 'Côte d’Ivoire, 12.5 kg (2020)';
    expect(escapeHtml(plain)).toBe(plain);
  });
});
